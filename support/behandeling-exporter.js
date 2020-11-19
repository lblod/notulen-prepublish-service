import { uuid, query, update, sparqlEscapeUri, sparqlEscapeString } from 'mu';
import {handleVersionedResource, cleanupTriples, hackedSparqlEscapeString} from './pre-importer';
import {findFirstNodeOfType, findAllNodesOfType} from '@lblod/marawa/dist/dom-helpers';
import { analyse, resolvePrefixes } from '@lblod/marawa/dist/rdfa-context-scanner';
import * as path from "path";
import * as fs from "fs";
import Handlebars from "handlebars";
import {prefixes, prefixMap} from "./prefixes";

/**
 * Finds a versioned behandeling based on provided uri
 * does not check if it's linked to the right container
 */
async function findVersionedBehandeling(uuid) {
  const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?versionedBehandeling ?body ?uuid ?behandeling
      WHERE
      {
        ?versionedBehandeling a ext:VersionedBehandeling;
                  mu:uuid ?uuid;
                  ext:content ?body;
                  ext:behandeling ?behandeling.
        ?behandeling mu:uuid ${sparqlEscapeString(uuid)}.
      }
  `);
  const bindings = r.results.bindings;
  if (bindings.length > 0)
    return { body: bindings[0].body.value, behandeling: bindings[0].behandeling.value, uuid: bindings[0].uuid.value, versionedBehandeling: bindings[0].versionedBehandeling.value };
  else
    return null;
}

/**
 * extracts a behandeling from the supplied document
 * searches for a BehandelingVanAgendapunt in the document with a matching uri and returns that node
 */
function createBehandelingExtract(zitting, agendapunt, isWrappedInZittingInfo = true) {
  const behandelingHtml = generateBehandelingHTML(agendapunt);
  if (isWrappedInZittingInfo) {
    return wrapZittingInfo(zitting, behandelingHtml);
  } else {
    return behandelingHtml;
  }
}

function wrapZittingInfo(zitting, behandelingHTML) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/behandeling-prepublish.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  return template({behandelingHTML, zitting, prefixes: prefixes.join(" ")});
}

function generateBehandelingHTML(agendapunt) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/behandeling-html.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  const behandelingUri = agendapunt.behandeling.uri;
  const agendapuntUri = agendapunt;
  const agendapuntTitle = agendapunt.title;
  const openbaar = agendapunt.behandeling.openbaar;
  const document = agendapunt.behandeling.document.content;
  const presentMandatees = agendapunt.behandeling.presentMandatees;
  const stemmings = agendapunt.behandeling.stemmings;
  return template({behandelingUri, agendapuntUri, agendapuntTitle, openbaar, document, presentMandatees, stemmings});
}

/**
 * Creates a versioned behandeling in the triple store which could be signed or published
 * The versioned behandeling is attached to the document container
 */
async function ensureVersionedBehandelingForZitting(zitting, behandelingUuid) {
  const versionedBehandeling = await findVersionedBehandeling(behandelingUuid);
  if (versionedBehandeling) {
    console.log(`reusing versioned behandeling for document ${zitting.uri} and behandeling ${behandelingUuid}`);
    return versionedBehandeling.versionedBehandeling;
  }
  else {
    console.log(`creating a new versioned behandeling for document ${zitting.uri} and behandeling ${behandelingUuid}`);
    const agendapunt = zitting.agendapunten.find((agendapunt) => agendapunt.behandeling.uuid === behandelingUuid);
    const newExtract = createBehandelingExtract(zitting, agendapunt);
    const versionedBehandelingUuid = uuid();
    const versionedBehandelingUri = `http://data.lblod.info/prepublished-behandelingen/${versionedBehandelingUuid}`;
    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(versionedBehandelingUri)}
           a ext:VersionedBehandeling;
           ext:content ${hackedSparqlEscapeString( newExtract )};
           mu:uuid ${sparqlEscapeString( versionedBehandelingUuid )};
           ext:behandeling ?behandeling.
        ${sparqlEscapeUri(zitting.uri)} ext:hasVersionedBehandeling ${sparqlEscapeUri(versionedBehandelingUri)}.
      } WHERE {
        ?behandeling mu:uuid ${sparqlEscapeString(behandelingUuid)}
      }`);
    return versionedBehandelingUri;
  }
}

/**
 * Returns extracts of behandelings van agendapunten, either extracted from the document or if it already exists in the store the version from the store.
 * NOTE: this is different from other extractions!
 * Returns an array of behandeling extractions
 */
async function extractBehandelingVanAgendapuntenFromZitting( zitting, isWrappedInZittingInfo ) {
    const agendapunten = zitting.agendapunten;
    const extracts = [];
    for (const agendapunt of agendapunten) {
      const newExtract = createBehandelingExtract(zitting, agendapunt, isWrappedInZittingInfo);
      console.log(`creating temporary behandeling extract for ${zitting.uri}`);
      extracts.push({
        data: {
          attributes: {
            content: newExtract,
            behandeling: agendapunt.behandeling.uuid
          }
        }
      });
    }
    return extracts;
}

/**
 * Checks if a behandeling has already been published or not.
 * Returns true if published, false if not.
 */
async function isPublished( behandelingUri ) {
  const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      SELECT ?versionedBehandeling
      WHERE
      {
        ?versionedBehandeling a ext:VersionedBehandeling;
                  ext:behandeling ${sparqlEscapeUri(behandelingUri)}.
        FILTER EXISTS { ?publishedResource ext:publishesBehandeling ?versionedBehandeling }.
      } LIMIT 1
  `);
  return r.results.bindings.length > 0;
}

async function signVersionedBehandeling( versionedBehandelingUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedBehandelingUri, sessionId, targetStatus, 'ext:signsBehandeling');
}

async function publishVersionedBehandeling( versionedBehandelingUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedBehandelingUri, sessionId, targetStatus, 'ext:publishesBehandeling');
}

export { extractBehandelingVanAgendapuntenFromZitting, ensureVersionedBehandelingForZitting, isPublished, signVersionedBehandeling, publishVersionedBehandeling }
