// @ts-ignore
import {query, sparqlEscapeString, sparqlEscapeUri} from "mu";
import {prefixMap} from "./prefixes";
import {DateTime} from 'luxon';

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
     SELECT * WHERE {
      ?uri a besluit:Zitting;
        besluit:behandelt ?agendapunten;
        besluit:isGehoudenDoor ?bestuursorgaanUri;
        besluit:geplandeStart ?geplandeStart;
        mu:uuid ${sparqlEscapeString(uuid)}.
      ?bestuursorgaanUri mandaat:isTijdspecialisatieVan ?mainBestuursorgaanUri.
      ?mainBestuursorgaanUri skos:prefLabel ?bestuursorgaanName.
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
        ?uri ext:intro ?intro.
      }
      OPTIONAL {
        ?uri ext:outro ?outro.
      }
    }`
  );
  if (queryResult.results.bindings.length === 0) {
    throw `Zitting with uuid: ${uuid} not found`;
  }
  const {bestuursorgaanUri, uri, geplandeStart, bestuursorgaanName, startedAt, endedAt, intro, outro} = queryResult.results.bindings[0];

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
      SELECT * 
      WHERE {
        BIND (<${uri}> AS ?agendaUri)
        <${uri}> besluit:geplandOpenbaar ?geplandOpenbaar.
        <${uri}> dct:title ?titel.
        <${uri}> dct:description ?description.
        ${sparqlEscapeUri(uri)} schema:position ?position.
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
    const stemmings = await fetchStemmings(agendapunten.bva.value);
    return {
      uri: agendapunten.agendaUri.value,
      geplandOpenbaar: agendapunten.geplandOpenbaar.value,
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

  const participationList = await fetchParticipationList(uri.value, bestuursorgaanUri.value);

  const intermissions = await fetchIntermissions(uri.value);
  
  return {
    bestuursorgaan: {
      uri: bestuursorgaanUri.value,
      name: bestuursorgaanName.value
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

async function fetchParticipationList(zittingUri, bestuursorgaan) {
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
        ?mandatarisUri org:holds ?roleUri.
        ?roleUri org:role ?bestuursfunctieCodeUri.
        ?bestuursfunctieCodeUri skos:prefLabel ?role.
        ?personUri foaf:familyName ?familyName.
        ?personUri persoon:gebruikteVoornaam ?name.
    } ORDER BY ASC(?familyName) ASC(?name)
  `);
  const present = presentQuery.results.bindings.map(processMandatee);
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
        ?mandatarisUri org:holds ?roleUri.
        ?roleUri org:role ?bestuursfunctieCodeUri.
        ?bestuursfunctieCodeUri skos:prefLabel ?role.
        ?personUri foaf:familyName ?familyName.
        ?personUri persoon:gebruikteVoornaam ?name.
    } ORDER BY ASC(?familyName) ASC(?name)
  `);
  const notPresent = notPresentQuery.results.bindings.map(processMandatee);
  console.log(notPresent);
  return {present, notPresent};
}

async function fetchStemmings(bvaUri) {
  const stemmingsQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(bvaUri)} besluit:heeftStemming ?stemmingUri.
      ?stemmingUri besluit:aantalVoorstanders ?positiveVotes;
        besluit:aantalTegenstanders ?negativeVotes;
        besluit:aantalOnthouders ?abstentionVotes;
        besluit:geheim ?geheim;
        besluit:onderwerp ?subject;
        besluit:gevolg ?result.
    }
  `);
  return await Promise.all(stemmingsQuery.results.bindings.map(processStemming));
}

async function processStemming(stemming) {
  const stemmingUri = stemming.stemmingUri.value;
  const attendeesQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftAanwezige ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?roleUri.
      ?roleUri org:role ?bestuursfunctieCodeUri.
      ?bestuursfunctieCodeUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const attendees = attendeesQuery.results.bindings.map(processMandatee);
  const votersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftStemmer ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?roleUri.
      ?roleUri org:role ?bestuursfunctieCodeUri.
      ?bestuursfunctieCodeUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const voters = votersQuery.results.bindings.map(processMandatee);

  const positiveVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftVoorstander ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?roleUri.
      ?roleUri org:role ?bestuursfunctieCodeUri.
      ?bestuursfunctieCodeUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const positiveVoters = positiveVotersQuery.results.bindings.map(processMandatee);

  const negativeVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftTegenstander ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?roleUri.
      ?roleUri org:role ?bestuursfunctieCodeUri.
      ?bestuursfunctieCodeUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const negativeVoters = negativeVotersQuery.results.bindings.map(processMandatee);

  const abstentionVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftOnthouder ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?roleUri.
      ?roleUri org:role ?bestuursfunctieCodeUri.
      ?bestuursfunctieCodeUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const abstentionVoters = abstentionVotersQuery.results.bindings.map(processMandatee);

  return {
    uri: stemmingUri,
    geheim: stemming.geheim.value,
    geheimText: stemming.geheim.value ? "De raad stemt openbaar," : "De raad stemt geheim,",
    positiveVotes: stemming.positiveVotes.value,
    negativeVotes: stemming.negativeVotes.value,
    abstentionVotes: stemming.abstentionVotes.value,
    subject : stemming.subject.value,
    result: stemming.result.value,
    attendees,
    voters,
    positiveVoters,
    negativeVoters,
    abstentionVoters
  };
}

function processMandatee(mandatee) {
  return {
    uri: mandatee.mandatarisUri.value,
    personUri: mandatee.personUri.value,
    name: mandatee.name.value,
    familyName: mandatee.familyName.value,
    roleUri: mandatee.roleUri.value,
    role: mandatee.role.value
  };
}

async function fetchIntermissions(zittingUri) {
  const intermissionsQuery = await query(`
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("prov").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(zittingUri)} ext:hasIntermission ?intermissionUri.
      ?intermissionUri prov:startedAtTime ?startedAt;
        prov:endedAtTime ?endedAt.
      OPTIONAL {
        ?intermissionUri rdfs:comment ?comment.
      }
    }
  `);
  const intermissions = intermissionsQuery.results.bindings.map(processIntermissions);
  return intermissions;
}

function processIntermissions(intermission) {
  return {
    uri: intermission.intermissionUri.value,
    startedAt: {
      value: intermission.startedAt.value,
      text: DateTime.fromISO(intermission.startedAt.value).toFormat(dateFormat)
    },
    endedAt: {
      value: intermission.endedAt.value,
      text: DateTime.fromISO(intermission.endedAt.value).toFormat(dateFormat)
    },
    comment: intermission.comment ? intermission.comment.value : undefined,
  };
}

export {getZittingForNotulen};
