// @ts-ignore
import {query, update, sparqlEscapeUri, sparqlEscapeString, uuid} from "mu";
import {
  handleVersionedResource,
  hackedSparqlEscapeString,
} from "./pre-importer";
import * as path from "path";
import * as fs from "fs";
import Handlebars from "handlebars";
import {prefixes, prefixMap} from "./prefixes";


/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 * @param {Support.Zitting} zitting
 * @returns {Promise<string>}
 */
async function buildAgendaContentFromZitting(zitting) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/agenda-prepublish.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  return template({zitting, prefixes: prefixes.join(" ")});
}

/**
 *
 * @param {Support.Zitting} zitting
 * @param {string} agendaKind
 * @return {Promise<string>}
 */
async function ensureVersionedAgendaForZitting(zitting, agendaKind) {
  /** @type {Support.QueryResult<"agendaUri">} */
  const previousId = await query(`
    ${prefixMap.get("bv").toSparqlString()}
    SELECT ?agendaUri
    WHERE {
      ?agendaUri
         a bv:Agenda;
         bv:isAgendaVoor ${sparqlEscapeUri(zitting.uri)};
         bv:agendaType ${sparqlEscapeString(agendaKind)}.
    } LIMIT 1`);

  if (previousId.results.bindings.length) {
    const versionedAgendaId = previousId.results.bindings[0].agendaUri.value;
    console.log(`Reusing versioned agenda ${versionedAgendaId}`);
    return versionedAgendaId;
  } else {
    console.log(`Creating a new versioned agenda for ${zitting.uri}`);
    const agendaContent = await buildAgendaContentFromZitting(zitting);
    const agendaUuid = uuid();
    const agendaUri = `http://data.lblod.info/id/agendas/${agendaUuid}`;

    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX bv: <http://data.vlaanderen.be/ns/besluitvorming#>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA {
        ${sparqlEscapeUri(agendaUri)}
           a bv:Agenda;
           ext:renderedContent ${hackedSparqlEscapeString(agendaContent)};
           bv:isAgendaVoor ${sparqlEscapeUri(zitting.uri)};
           mu:uuid ${sparqlEscapeString(agendaUuid)};
           bv:agendaType ${sparqlEscapeString(agendaKind)}.
      }`);

    return agendaUri;
  }
}

async function signVersionedAgenda(
  versionedAgendaUri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    "signature",
    versionedAgendaUri,
    sessionId,
    targetStatus,
    "ext:signsAgenda",
    "bv:agendaStatus",
    "ext:renderedContent"
  );
}

async function publishVersionedAgenda(
  versionedAgendaUri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    "publication",
    versionedAgendaUri,
    sessionId,
    targetStatus,
    "ext:publishesAgenda",
    "bv:agendaStatus",
    "ext:renderedContent"
  );
}

export {
  signVersionedAgenda,
  publishVersionedAgenda,
  ensureVersionedAgendaForZitting,
  buildAgendaContentFromZitting,
};
