// @ts-ignore
import {query, sparqlEscapeUri} from "mu";
import {prefixMap} from "./prefixes";
import Mandatee from "../models/mandatee";
import ParticipantCache from './participant-cache';


export function buildParticipantCache({present, notPresent, chairman, secretary}) {
  const mandatees = [
    ...present,
    ...notPresent,
    chairman,
    secretary
  ];
  const cache = new ParticipantCache();
  for (const mandatee of mandatees) {
    if (mandatee) {
      cache.set(mandatee.uri, mandatee);
    }
  }
  return cache;
}

export async function fetchParticipationListForTreatment(resourceUri) {
  return fetchParticipationList(resourceUri, "besluit:heeftAanwezige", "ext:heeftAfwezige");
}

export function sortMandatees(mandatees) {
  return mandatees.sort((mandateeA, mandateeB) => {
    return mandateeA.familyName.localeCompare(mandateeB.familyName)
      || mandateeA.name.localeCompare(mandateeB.name);
  });
}

export async function fetchTreatmentParticipantsWithCache(treatment, cache) {
  const secretary = treatment.secretary ? (await cache.get(treatment.secretary)) : null;
  const chairman = treatment.chairman ? (await cache.get(treatment.chairman)) : null;
  const presentQuery = await query(`
    ${prefixMap.get("besluit").toSparqlString()}
    SELECT ?mandatarisUri WHERE {
      {${sparqlEscapeUri(treatment.uri)} besluit:heeftAanwezige ?mandatarisUri.}
    }`);
  let present = await Promise.all(presentQuery.results.bindings.map((binding) => cache.get(binding.mandatarisUri.value)));
  present = sortMandatees(present);
  const notPresentQuery = await query(`
    ${prefixMap.get("ext").toSparqlString()}
    SELECT ?mandatarisUri WHERE {
      {${sparqlEscapeUri(treatment.uri)} ext:heeftAfwezige ?mandatarisUri.}
    }`);
  let notPresent = await Promise.all(notPresentQuery.results.bindings.map((binding) => cache.get(binding.mandatarisUri.value)));
  notPresent = sortMandatees(notPresent);
  return {secretary, chairman, present, notPresent};
}


export async function fetchCurrentUser(sessionId) {
  const q = `
    ${prefixMap.get("muSession").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
  SELECT ?userUri
  WHERE {
    ${sparqlEscapeUri(sessionId)} muSession:account/^foaf:account ?userUri.
  }
  `;
  const result = query(q);
  if (result?.results?.bindings.length === 1) {
    return result.results.bindings.userUri.value;
  }
  else {
    return null;
  }
}
export async function fetchParticipationList(resourceUri, presentPredicate = "besluit:heeftAanwezigeBijStart", absentPredicate = "ext:heeftAfwezigeBijStart") {
  const presentQuery = await query(`
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("org").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
    ${prefixMap.get("persoon").toSparqlString()}
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
  const present = presentQuery.results.bindings.map((binding) => new Mandatee(binding));
  const notPresentQuery = await query(`
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("org").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
    ${prefixMap.get("persoon").toSparqlString()}
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
  const notPresent = notPresentQuery.results.bindings.map((binding) => new Mandatee(binding));
  const {chairman, secretary} = await fetchChairmanAndSecretary(resourceUri);

  //If there's no information in the participation list we return undefined to make it easier to hide in the template
  if(present.length || notPresent.length || chairman || secretary) {
    return {present, notPresent, chairman, secretary};
  } else {
    return undefined;
  }
}

export async function fetchChairmanAndSecretary(uri){
  const chairmanAndSecretaryQuery = await query(`
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("org").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
    ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      OPTIONAL {
        ${sparqlEscapeUri(uri)} besluit:heeftVoorzitter ?chairmanUri.
          ?chairmanUri mandaat:isBestuurlijkeAliasVan ?chairmanPersonUri.
          ?chairmanUri org:holds ?chairmanPositionUri.
          ?chairmanPositionUri org:role ?chairmanRoleUri.
          ?chairmanRoleUri skos:prefLabel ?chairmanRole.
          ?chairmanPersonUri foaf:familyName ?chairmanFamilyName.
          ?chairmanPersonUri persoon:gebruikteVoornaam ?chairmanName.
      }
      OPTIONAL {
        ${sparqlEscapeUri(uri)} besluit:heeftSecretaris ?secretaryUri.
          ?secretaryUri mandaat:isBestuurlijkeAliasVan ?secretaryPersonUri.
          ?secretaryUri org:holds ?secretaryPositionUri.
          ?secretaryPositionUri org:role ?secretaryRoleUri.
          ?secretaryRoleUri skos:prefLabel ?secretaryRole.
          ?secretaryPersonUri foaf:familyName ?secretaryFamilyName.
          ?secretaryPersonUri persoon:gebruikteVoornaam ?secretaryName.
      }
    }
  `);
  return processChairmanAndSecretary(chairmanAndSecretaryQuery.results.bindings[0]);
}

function processChairmanAndSecretary(bindings) {
  let chairman;
  if(bindings.chairmanUri) {
    chairman = {
      uri: bindings.chairmanUri.value,
      personUri: bindings.chairmanPersonUri.value,
      name: bindings.chairmanName.value,
      familyName: bindings.chairmanFamilyName.value,
      positionUri: bindings.chairmanPositionUri.value,
      roleUri: bindings.chairmanRoleUri.value,
      role: bindings.chairmanRole.value
    };
  }
  let secretary;
  if(bindings.secretaryUri) {
    secretary = {
      uri: bindings.secretaryUri.value,
      personUri: bindings.secretaryPersonUri.value,
      name: bindings.secretaryName.value,
      familyName: bindings.secretaryFamilyName.value,
      positionUri: bindings.secretaryPositionUri.value,
      roleUri: bindings.secretaryRoleUri.value,
      role: bindings.secretaryRole.value
    };
  }
  return {chairman, secretary};
}
