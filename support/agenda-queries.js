import {query, sparqlEscapeString} from "mu";
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
async function getZitting(uuid) {
  /**
   * @typedef { "uri"
   * | "agendapunten"
   * | "bestuursorgaan"
   * | "geplandeStart"
   * | "gestartOpTijdstip"
   * | "geeindigdOpTijdstip" } QVars
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
            prov:startedAtTime ?gestartOpTijdstip;
            prov:endedAtTime ?geeindigdOpTijdstip;
            <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString(
              uuid
            )}
     }`
  );
  console.log("Queryresult: ", queryResult);
  if (queryResult.results.bindings.length === 0)
    throw `No content found for EditorDocument ${uuid}`;
  const {
    bestuursorgaan,
    uri,
    gestartOpTijdstip,
    geplandeStart,
  } = queryResult.results.bindings[0];

  const agendaUris = queryResult.results.bindings.map(
    (b) => b.agendapunten.value
  );
  const agendaQueries = agendaUris.map((uri) =>
    query(`
     ${prefixMap.get("besluit").toSparqlString()}
     ${prefixMap.get("dct").toSparqlString()}
      SELECT * 
      WHERE {
          BIND (<${uri}> AS ?agendaUri)
          <${uri}> besluit:geplandOpenbaar ?geplandOpenbaar.
          <${uri}> dct:title ?titel.
          } `)
  );
  /** @type {Support.QueryResult<"agendaUri" | "geplandOpenbaar" | "titel">[]} */
  const agendaResults = await Promise.all(agendaQueries);
  const agendapunten = agendaResults.map((rslt) => {
    const {agendaUri, geplandOpenbaar, titel} = rslt.results.bindings[0];
    return {
      uri: agendaUri.value,
      geplandOpenbaar: geplandOpenbaar.value,
      titel: titel.value,
    };
  });

  return {
    bestuursorgaan: bestuursorgaan.value,
    geplandeStart: geplandeStart.value,
    gestartOpTijdstip: gestartOpTijdstip.value,
    uri: uri.value,
    agendapunten,
  };
}

export {getZitting};
