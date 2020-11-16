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
async function getZittingForAgenda(uuid) {
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
            )}.
     }`
  );
  if (queryResult.results.bindings.length === 0) {
    throw `Zitting with uuid: ${uuid} not found`;
  }

  const {bestuursorgaan, uri, geplandeStart} = queryResult.results.bindings[0];

  const agendaUris = queryResult.results.bindings.map(
    (b) => b.agendapunten.value
  );
  const agendaQueries = agendaUris.map((uri) =>
    query(`
     ${prefixMap.get("besluit").toSparqlString()}
     ${prefixMap.get("dct").toSparqlString()}
     ${prefixMap.get("schema").toSparqlString()}
      SELECT * 
      WHERE {
          BIND (<${uri}> AS ?agendaUri)
          <${uri}> besluit:geplandOpenbaar ?geplandOpenbaar.
          <${uri}> dct:title ?titel.
          ${sparqlEscapeUri(uri)} schema:position ?position.
          } `)
  );
  /** @type {Support.QueryResult<"agendaUri" | "geplandOpenbaar" | "titel">[]} */
  const agendaResults = await Promise.all(agendaQueries);
  const agendapunten = agendaResults.map((rslt) => {
    const {agendaUri, geplandOpenbaar, titel, position} = rslt.results.bindings[0];
    return {
      uri: agendaUri.value,
      geplandOpenbaar: geplandOpenbaar.value,
      titel: titel.value,
      position: position.value
    };
  });

  const agendapuntenSorted = agendapunten.sort((a, b) => a.position > b.position ? 1 : -1);

  return {
    bestuursorgaan: bestuursorgaan.value,
    geplandeStart: geplandeStart.value,
    uri: uri.value,
    agendapunten: agendapuntenSorted,
  };
}

export {getZittingForAgenda};
