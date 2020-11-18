import {query, sparqlEscapeString, sparqlEscapeUri} from "mu";
import {prefixMap} from "./prefixes";

/**
 * @typedef {import("./types").Support}
 */

/**
 * Retrieves the zitting belonging to the supplied zitting uuid
 *
 * @method editorDocumentFromUuid
 *
 * @param {string} uuid UUID which is coupled to the Zitting
 * mu:uuid property.
 *
 * @return {Promise<Support.Zitting>} Promise which resolves to an object representing
 * the zitting
 */
async function getZittingForBehandeling(uuid) {
  /**
   * @typedef { "uri"
   * | "agendapunten"
   * | "bestuursorgaan"
   * | "geplandeStart" } QVars
   */

  /**
   * @type {Support.QueryResult<QVars>}
   */
  const queryResult = await query(
    `${prefixMap.get("ext").toSparqlString()} 
     ${prefixMap.get("besluit").toSparqlString()}
     ${prefixMap.get("prov").toSparqlString()}
     SELECT * WHERE {
       ?uri a besluit:Zitting;
            besluit:behandelt ?agendapunten;

            besluit:isGehoudenDoor ?bestuursorgaan;
            besluit:geplandeStart ?geplandeStart;
            <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString(
              uuid
            )}
     }`
  );
  if (queryResult.results.bindings.length === 0) {
    throw `Zitting with uuid: ${uuid} not found`;
  }

  const {bestuursorgaan, uri, geplandeStart} = queryResult.results.bindings[0];

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
        ${sparqlEscapeUri(uri)} schema:position ?position.
        ?bva dct:subject ${sparqlEscapeUri(uri)}.
        ?bva mu:uuid ?bvaUuid.
        ?bva ext:hasDocumentContainer ?document.
        ?bva besluit:openbaar ?openbaar.
        ?document pav:hasCurrentVersion ?editorDocument.
        ?editorDocument <http://mu.semte.ch/vocabularies/core/uuid> ?editorDocumentUuid;
          ext:editorDocumentContent ?documentContent.
        OPTIONAL {
          ?bva besluit:heeftSecretaris ?secretaris.
          ?bva besluit:heeftVoorzitter ?voorzitter.
        }
      }
    `)
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
      }
    `)
    const presentMandatees = mandateesResults.results.bindings.map(mandatee => ({
      uri: mandatee.mandatarisUri.value,
      personUri: mandatee.personUri.value,
      name: mandatee.name.value,
      familyName: mandatee.familyName.value
    }))
    const stemmings = await fetchStemmings(agendapunten.bva.value)
    return {
      uri: agendapunten.agendaUri.value,
      geplandOpenbaar: agendapunten.geplandOpenbaar.value,
      position: agendapunten.position.value,
      titel: agendapunten.titel.value,
      behandeling: {
        uri: agendapunten.bva.value,
        uuid: agendapunten.bvaUuid.value,
        openbaar: agendapunten.openbaar.value,
        presentMandatees,
        stemmings,
        document: {
          uuid: agendapunten.editorDocumentUuid.value,
          content: agendapunten.documentContent.value
        }
      }
    }
  });
  /** @type {Support.QueryResult<"agendaUri" | "geplandOpenbaar" | "titel">[]} */
  const agendapunten = await Promise.all(agendaQueries);

  const agendapuntenSorted = agendapunten.sort((a, b) => a.position > b.position ? 1 : -1)


  return {
    bestuursorgaan: bestuursorgaan.value,
    geplandeStart: geplandeStart.value,
    uri: uri.value,
    agendapunten: agendapuntenSorted,
  };
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
  `)
  return await Promise.all(stemmingsQuery.results.bindings.map(processStemming))
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
  `)
  const attendees = attendeesQuery.results.bindings.map(processMandatee)
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
  `)
  const voters = votersQuery.results.bindings.map(processMandatee)

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
  `)
  const positiveVoters = positiveVotersQuery.results.bindings.map(processMandatee)

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
  `)
  const negativeVoters = negativeVotersQuery.results.bindings.map(processMandatee)

  const abstentionVotersQuery = await query(`
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
  `)
  const abstentionVoters = abstentionVotersQuery.results.bindings.map(processMandatee)

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
  }
}

function processMandatee(mandatee) {
  return {
    uri: mandatee.mandatarisUri.value,
    personUri: mandatee.personUri.value,
    name: mandatee.name.value,
    familyName: mandatee.familyName.value,
    roleUri: mandatee.roleUri.value,
    role: mandatee.role.value
  }
}

export {getZittingForBehandeling};