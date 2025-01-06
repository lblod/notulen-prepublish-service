// @ts-ignore
import { query, sparqlEscapeUri } from 'mu';
import { prefixMap } from './prefixes';
import Mandatee from '../models/mandatee';
import ParticipantCache from './participant-cache';

export function buildParticipantCache({
  present,
  notPresent,
  chairman,
  secretary,
}) {
  const mandatees = [...present, ...notPresent, chairman, secretary];
  const cache = new ParticipantCache();
  for (const mandatee of mandatees) {
    if (mandatee) {
      cache.set(mandatee.uri, mandatee);
    }
  }
  return cache;
}

export async function fetchParticipationListForTreatment(resourceUri) {
  return fetchParticipationList(
    resourceUri,
    'besluit:heeftAanwezige',
    'ext:heeftAfwezige'
  );
}

export function sortMandatees(mandatees) {
  return mandatees.sort((mandateeA, mandateeB) => {
    return (
      mandateeA.familyName.localeCompare(mandateeB.familyName) ||
      mandateeA.name.localeCompare(mandateeB.name)
    );
  });
}

export async function fetchTreatmentParticipantsWithCache(treatment, cache) {
  const secretary = treatment.secretary
    ? await cache.get(treatment.secretary)
    : null;
  const chairman = treatment.chairman
    ? await cache.get(treatment.chairman)
    : null;
  const presentQuery = await query(`
    ${prefixMap.get('besluit').toSparqlString()}
    SELECT ?mandatarisUri WHERE {
      {${sparqlEscapeUri(treatment.uri)} besluit:heeftAanwezige ?mandatarisUri.}
    }`);
  let present = await Promise.all(
    presentQuery.results.bindings.map((binding) =>
      cache.get(binding.mandatarisUri.value)
    )
  );
  present = sortMandatees(present);
  const notPresentQuery = await query(`
    ${prefixMap.get('ext').toSparqlString()}
    SELECT ?mandatarisUri WHERE {
      {${sparqlEscapeUri(treatment.uri)} ext:heeftAfwezige ?mandatarisUri.}
    }`);
  let notPresent = await Promise.all(
    notPresentQuery.results.bindings.map((binding) =>
      cache.get(binding.mandatarisUri.value)
    )
  );
  notPresent = sortMandatees(notPresent);
  return { secretary, chairman, present, notPresent };
}

export async function fetchCurrentUser(sessionId) {
  const q = `
    ${prefixMap.get('muSession').toSparqlString()}
    ${prefixMap.get('dct').toSparqlString()}
    ${prefixMap.get('foaf').toSparqlString()}
  SELECT ?userUri
  WHERE {
    ${sparqlEscapeUri(sessionId)} muSession:account/^foaf:account ?userUri.
  }
  `;
  const result = await query(q);
  if (result?.results?.bindings.length === 1) {
    return result.results.bindings[0].userUri.value;
  } else {
    return null;
  }
}
export async function fetchParticipationList(
  resourceUri,
  presentPredicate = 'besluit:heeftAanwezigeBijStart',
  absentPredicate = 'ext:heeftAfwezigeBijStart'
) {
  const presentQuery = await query(`
    ${prefixMap.get('besluit').toSparqlString()}
    ${prefixMap.get('mandaat').toSparqlString()}
    ${prefixMap.get('org').toSparqlString()}
    ${prefixMap.get('skos').toSparqlString()}
    ${prefixMap.get('foaf').toSparqlString()}
    ${prefixMap.get('persoon').toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(resourceUri)} ${presentPredicate} ?mandatarisUri.
        ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
        ?mandatarisUri org:holds ?positionUri.
        ?positionUri org:role ?roleUri.
        ?roleUri skos:prefLabel ?role.
        ?personUri foaf:familyName ?familyName.
        ?personUri persoon:gebruikteVoornaam ?name.
    } ORDER BY ASC(?familyName) ASC(?name)
  `);
  const present = presentQuery.results.bindings.map(
    (binding) => new Mandatee(binding)
  );
  const notPresentQuery = await query(`
    ${prefixMap.get('besluit').toSparqlString()}
    ${prefixMap.get('ext').toSparqlString()}
    ${prefixMap.get('mandaat').toSparqlString()}
    ${prefixMap.get('org').toSparqlString()}
    ${prefixMap.get('skos').toSparqlString()}
    ${prefixMap.get('foaf').toSparqlString()}
    ${prefixMap.get('persoon').toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(resourceUri)} ${absentPredicate} ?mandatarisUri.
        ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
        ?mandatarisUri org:holds ?positionUri.
        ?positionUri org:role ?roleUri.
        ?roleUri skos:prefLabel ?role.
        ?personUri foaf:familyName ?familyName.
        ?personUri persoon:gebruikteVoornaam ?name.
    } ORDER BY ASC(?familyName) ASC(?name)
  `);
  const notPresent = notPresentQuery.results.bindings.map(
    (binding) => new Mandatee(binding)
  );
  const { chairman, secretary } = await fetchChairmanAndSecretary(resourceUri);

  //If there's no information in the participation list we return undefined to make it easier to hide in the template
  if (present.length || notPresent.length || chairman || secretary) {
    return { present, notPresent, chairman, secretary };
  } else {
    return undefined;
  }
}

export async function fetchChairmanAndSecretary(uri) {
  const chairmanAndSecretaryQuery = await query(`
    ${prefixMap.get('besluit').toSparqlString()}
    ${prefixMap.get('ext').toSparqlString()}
    ${prefixMap.get('mandaat').toSparqlString()}
    ${prefixMap.get('org').toSparqlString()}
    ${prefixMap.get('skos').toSparqlString()}
    ${prefixMap.get('foaf').toSparqlString()}
    ${prefixMap.get('persoon').toSparqlString()}
    SELECT DISTINCT * WHERE {
      {
      SELECT ?mandatarisUri ?relation WHERE {
        {
          ${sparqlEscapeUri(uri)} besluit:heeftVoorzitter ?mandatarisUri.
          BIND(besluit:heeftVoorzitter as ?relation)
        }
        UNION
        {
          ${sparqlEscapeUri(uri)} besluit:heeftSecretaris ?mandatarisUri.
          BIND(besluit:heeftSecretaris as ?relation)
        }
      }
    }
    ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
    ?mandatarisUri org:holds ?positionUri.
    ?positionUri org:role ?roleUri.
    ?roleUri skos:prefLabel ?role.
    ?personUri foaf:familyName ?familyName.
    ?personUri persoon:gebruikteVoornaam ?name.
   }
  `);
  return processChairmanAndSecretary(
    chairmanAndSecretaryQuery.results.bindings
  );
}

function processChairmanAndSecretary(bindings) {
  let chairman, secretary;
  for (const binding of bindings) {
    if (
      binding.relationship?.value ==
      'http://data.vlaanderen.be/ns/besluit#heeftVoorzitter'
    ) {
      chairman = new Mandatee(binding);
    } else if (
      binding.relationship?.value ==
      'http://data.vlaanderen.be/ns/besluit#heeftSecretaris'
    ) {
      secretary = new Mandatee(binding);
    }
  }
  return { chairman, secretary };
}
