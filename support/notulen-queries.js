// @ts-ignore
import {query, sparqlEscapeString, sparqlEscapeUri} from "mu";
import {prefixMap} from "./prefixes";
import { fetchChairmanAndSecretary } from './query-utils';
import { fetchStemmingen } from './query-utils';
import {DateTime} from 'luxon';
import Mandatee from '../models/mandatee';
const dateFormat = process.env.DATE_FORMAT || 'dd/MM/yyyy HH:mm:ss';

/**
 * Retrieves the zitting belonging to the supplied zitting uuid
 *
 * @method editorDocumentFromUuid
 *
 * @param {string} uuid UUID which is coupled to the Zitting
 * mu:uuid property.
 *
 */
async function getZittingForNotulen(uuid) {

  const queryResult = await query(
    `${prefixMap.get("ext").toSparqlString()}
     ${prefixMap.get("besluit").toSparqlString()}
     ${prefixMap.get("prov").toSparqlString()}
     ${prefixMap.get("mu").toSparqlString()}
     ${prefixMap.get("skos").toSparqlString()}
     ${prefixMap.get("mandaat").toSparqlString()}
     ${prefixMap.get("notulen").toSparqlString()}
     SELECT * WHERE {
      ?uri a besluit:Zitting;
        besluit:behandelt ?agendapunten;
        besluit:isGehoudenDoor ?bestuursorgaanUri;
        besluit:geplandeStart ?geplandeStart;
        mu:uuid ${sparqlEscapeString(uuid)}.
      ?bestuursorgaanUri mandaat:isTijdspecialisatieVan ?mainBestuursorgaanUri.
      ?mainBestuursorgaanUri skos:prefLabel ?bestuursorgaanName;
        besluit:classificatie ?bestuursorgaanClassificatie;
        besluit:bestuurt ?bestuursorgaanBestuurt.
      OPTIONAL {
        ?uri prov:atLocation ?location.
      }
      OPTIONAL {
        ?uri prov:startedAtTime ?startedAt.
      }
      OPTIONAL {
        ?uri prov:endedAtTime ?endedAt.
      }
      OPTIONAL {
        ?uri notulen:intro ?intro.
      }
      OPTIONAL {
        ?uri notulen:outro ?outro.
      }
    }`
  );
  if (queryResult.results.bindings.length === 0) {
    throw `Zitting with uuid: ${uuid} not found`;
  }
  const {bestuursorgaanUri, uri, geplandeStart, bestuursorgaanName, bestuursorgaanClassificatie, bestuursorgaanBestuurt,  startedAt, endedAt, intro, outro} = queryResult.results.bindings[0];

  const agendaUris = queryResult.results.bindings.map(
    (b) => b.agendapunten.value
  );
  const agendaQueries = agendaUris.map(async (uri) => {
    const queryResults = await query(`
      ${prefixMap.get("besluit").toSparqlString()}
      ${prefixMap.get("dct").toSparqlString()}
      ${prefixMap.get("ext").toSparqlString()}
      ${prefixMap.get("pav").toSparqlString()}
      ${prefixMap.get("schema").toSparqlString()}
      ${prefixMap.get("mu").toSparqlString()}
      ${prefixMap.get("skos").toSparqlString()}
      SELECT *
      WHERE {
        BIND (${sparqlEscapeUri(uri)} AS ?agendaUri)
        ${sparqlEscapeUri(uri)} besluit:geplandOpenbaar ?geplandOpenbaar;
          dct:title ?titel;
          dct:description ?description;
          schema:position ?position.
        ?bva dct:subject ${sparqlEscapeUri(uri)}.
        ?bva mu:uuid ?bvaUuid.
        ?bva besluit:openbaar ?openbaar.
        OPTIONAL {
          ?bva besluit:heeftSecretaris ?secretaris.
        }
        OPTIONAL{
          ?bva besluit:heeftVoorzitter ?voorzitter.
        }
        OPTIONAL {
          ?bva ext:hasDocumentContainer ?document.
          ?document pav:hasCurrentVersion ?editorDocument.
          ?editorDocument <http://mu.semte.ch/vocabularies/core/uuid> ?editorDocumentUuid;
          ext:editorDocumentContent ?documentContent.
        }
        OPTIONAL {
          ${sparqlEscapeUri(uri)} besluit:Agendapunt.type ?type.
          ?type skos:prefLabel ?typeName.
        }
      }
    `);
    if (queryResults.results.bindings.length == 0 ) {
      return null;
    }
    const agendapunten = queryResults.results.bindings[0];
    const mandateesResults = await query(`
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
    ${prefixMap.get("persoon").toSparqlString()}
      SELECT * WHERE {
        ${sparqlEscapeUri(agendapunten.bva.value)} besluit:heeftAanwezige ?mandatarisUri.
        ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
        ?personUri foaf:familyName ?familyName.
        ?personUri persoon:gebruikteVoornaam ?name.
      } ORDER BY ASC(?familyName) ASC(?name)
    `);
    const presentMandatees = mandateesResults.results.bindings.map(mandatee => ({
      uri: mandatee.mandatarisUri.value,
      personUri: mandatee.personUri.value,
      name: mandatee.name.value,
      familyName: mandatee.familyName.value
    }));
    const stemmings = await fetchStemmingen(agendapunten.bva.value);
    const defaultPlannedType = {
      uri: 'http://lblod.data.gift/concepts/bdf68a65-ce15-42c8-ae1b-19eeb39e20d0',
      label: 'gepland',
    };
    const type = agendapunten.type && agendapunten.type.value;
    const typeName = agendapunten.typeName && agendapunten.typeName.value;
    return {
      uri: agendapunten.agendaUri.value,
      geplandOpenbaar: agendapunten.geplandOpenbaar.value,
      type: type ? type : defaultPlannedType.uri,
      typeName: typeName ? typeName : defaultPlannedType.label,
      position: agendapunten.position.value,
      titel: agendapunten.titel.value,
      description: agendapunten.description.value,
      behandeling: {
        uri: agendapunten.bva.value,
        uuid: agendapunten.bvaUuid.value,
        openbaar: agendapunten.openbaar.value,
        presentMandatees,
        stemmings,
        document: {
          uuid: agendapunten.editorDocumentUuid && agendapunten.editorDocumentUuid.value,
          content: agendapunten.documentContent && agendapunten.documentContent.value
        }
      }
    };
  });
  const agendapunten = await Promise.all(agendaQueries);

  const agendapuntenSorted = agendapunten.filter((a) => a != null).sort((a, b) => Number(a.position) > Number(b.position) ? 1 : -1);

  const participationList = await fetchParticipationList(uri.value);

  const intermissions = await fetchIntermissions(uri.value);

  return {
    bestuursorgaan: {
      uri: bestuursorgaanUri.value,
      name: bestuursorgaanName.value,
      classification: bestuursorgaanClassificatie.value,
      bestuurseenheid: bestuursorgaanBestuurt.value

    },
    location: queryResult.results.bindings[0].location ? queryResult.results.bindings[0].location.value : '',
    geplandeStart: {
      value: geplandeStart && geplandeStart.value,
      text: geplandeStart && DateTime.fromISO(geplandeStart.value).toFormat(dateFormat)
    },
    startedAt: {
      value: startedAt && startedAt.value,
      text: startedAt && DateTime.fromISO(startedAt.value).toFormat(dateFormat),
    },
    endedAt: {
      value: endedAt && endedAt.value,
      text: endedAt && DateTime.fromISO(endedAt.value).toFormat(dateFormat),
    },
    intro: intro && intro.value,
    outro: outro && outro.value,
    zittingUri: uri.value,
    participationList,
    agendapunten: agendapuntenSorted,
    intermissions: intermissions
  };
}

async function fetchParticipationList(zittingUri) {
  const presentQuery = await query(`
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("org").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
    ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(zittingUri)} besluit:heeftAanwezigeBijStart ?mandatarisUri.
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
      ${sparqlEscapeUri(zittingUri)} ext:heeftAfwezigeBijStart ?mandatarisUri.
        ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
        ?mandatarisUri org:holds ?positionUri.
        ?positionUri org:role ?roleUri.
        ?roleUri skos:prefLabel ?role.
        ?personUri foaf:familyName ?familyName.
        ?personUri persoon:gebruikteVoornaam ?name.
    } ORDER BY ASC(?familyName) ASC(?name)
  `);
  const notPresent = notPresentQuery.results.bindings.map((binding) => new Mandatee(binding));
  const {chairman, secretary} = await fetchChairmanAndSecretary(zittingUri);

  //If there's no information in the participation list we return undefined to make it easier to hide in the template
  if(present.length || notPresent.length || chairman || secretary) {
    return {present, notPresent, chairman, secretary};
  } else {
    return undefined;
  }
}


async function fetchIntermissions(zittingUri) {
  const intermissionsQuery = await query(`
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("prov").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(zittingUri)} ext:hasIntermission ?intermissionUri.
      ?intermissionUri prov:startedAtTime ?startedAt.
      OPTIONAL{
        ?intermissionUri prov:endedAtTime ?endedAt.
      }
      OPTIONAL {
        ?intermissionUri rdfs:comment ?comment.
      }
      OPTIONAL {
        ?intermissionUri ext:agendaPosition ?agendaPosUri.

        ?agendaPosUri dct:related ?posApUri.
        ?agendaPosUri ext:location ?posConceptUri.

        ?posConceptUri skos:prefLabel ?positionLabel.

        ?posApUri dct:title ?positionApTitle.
      }
    }
  `);
  const intermissions = intermissionsQuery.results.bindings.map(processIntermissions);
  return intermissions;
}
function translatePosLabel(label){
  switch (label) {
    case "before":
      return "Voor";
    case "during":
      return "Tijdens";
    case "after":
      return "Na";
    default:
      break;
  }
}
function processIntermissions(intermission) {
  return {
    uri: intermission.intermissionUri.value,
    startedAt: {
      value: intermission.startedAt.value,
      text: DateTime.fromISO(intermission.startedAt.value).toFormat(dateFormat)
    },
    endedAt: {
      value: intermission.endedAt ? intermission.endedAt.value : undefined,
      text: intermission.endedAt ? DateTime.fromISO(intermission.endedAt.value).toFormat(dateFormat): undefined
    },
    comment: intermission.comment ? intermission.comment.value : undefined,
    apPosition: {
      agendaPosUri: intermission.agendaPosUri ? intermission.agendaPosUri.value : undefined,

      apUri: intermission.posApUri ? intermission.posApUri.value : undefined,
      apTitle: intermission.positionApTitle ? intermission.positionApTitle.value : undefined,

      positionLabel: intermission.positionLabel ? translatePosLabel(intermission.positionLabel.value) : undefined,
      positionUri: intermission.posConceptUri ? intermission.posConceptUri.value : undefined
    }
  };
}

export {getZittingForNotulen};
