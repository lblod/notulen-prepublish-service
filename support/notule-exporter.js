// @ts-ignore
import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import { handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';
import { createBehandelingExtract } from './behandeling-exporter';
import { prefixes } from "./prefixes";
import * as path from "path";
import * as fs from "fs";
import Handlebars from "handlebars";

/**
 * This file contains helpers for exporting, signing and publishing content from the notule.
 */

/**
 * Extracts the Notulen content from the supplied zitting
 * Returns an HTML+RDFa snippet containing the zitting content
 * If a list of publicBehandelingUris is passed, the snippet will contain only those behandelingen.
 * If publicBehandelingUris is null, the snippet will contain all behandelingen.
 */
async function extractNotulenContentFromZitting(zitting, publicBehandelingUris) {
  let behandelingsHtml = '';
  behandelingsHtml = generateBehandelingHtml(zitting, publicBehandelingUris);
  const notulenData = Object.assign(zitting, {behandelingsHtml, prefixes: prefixes.join(' ')});
  return generateNotulenHtml(notulenData);
}

function generateNotulenHtml(notulenData) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/notulen-prepublish.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  return template(notulenData);
}

function generateBehandelingHtml(zitting, publicBehandelingUris) {
  let behandelingHTML = '';
  for(const agendapunt of zitting.agendapunten) {
    if(!publicBehandelingUris || publicBehandelingUris.includes(agendapunt.behandeling.uri)) {
      behandelingHTML += createBehandelingExtract(zitting, agendapunt, false);
    }
  }
  return behandelingHTML;
}

async function signVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedNotulenUri, sessionId, targetStatus, 'ext:signsNotulen');
}

async function publishVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedNotulenUri, sessionId, targetStatus, 'ext:publishesNotulen');
}

/**
 * Creates a versioned notulen item in the triplestore which could be signed.
 * The versioned notulen are attached to the document container.
 * The content of the versioned notulen always contains the full Zitting from the document
 * Additionally, on publication the versioned notulen also gets a public-content property containing
 * only the behandelingen that are public.
 */
async function ensureVersionedNotulenForZitting( zitting, type, publicBehandelingUris ) {
  // TODO remove (or move) relationship between previously signable notulen, and the current notulen.
  const previousId = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX sign: <http://mu.semte.ch/vocabularies/ext/signing/>

    SELECT ?notulenUri
    WHERE {
      ?notulenUri
        a ext:VersionedNotulen.
      ${sparqlEscapeUri(zitting.zittingUri)} ext:hasVersionedNotulen  ?notulenUri.
    } LIMIT 1`);
  if( previousId.results.bindings.length ) {
    const versionedNotulenId = previousId.results.bindings[0].notulenUri.value;
    console.log(`Reusing versioned notulen ${versionedNotulenId}`);
    if (type == 'publication')
      addPublicContentOnVersionedNotulen(zitting, versionedNotulenId, publicBehandelingUris);
    return versionedNotulenId;
  } else {
    console.log(`Creating a new versioned notulen for ${zitting.zittingUri}`);
    const notulenContent = await extractNotulenContentFromZitting(zitting, publicBehandelingUris);
    const notulenUuid = uuid();
    const notulenUri = `http://data.lblod.info/prepublished-notulen/${notulenUuid}`;

    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA{
        ${sparqlEscapeUri(notulenUri)}
           a ext:VersionedNotulen;
           ext:content ${hackedSparqlEscapeString(notulenContent)};
           mu:uuid ${sparqlEscapeString( notulenUuid )}.
        ${sparqlEscapeUri(zitting.zittingUri)} ext:hasVersionedNotulen ${sparqlEscapeUri(notulenUri)}.
      }`);
    if (type == 'publication')
      await addPublicContentOnVersionedNotulen(zitting, notulenUri, publicBehandelingUris);

    return notulenUri;
  }
};

/**
 * Sets the public-content of a versioned notulen containing only the public behandeling of the Zitting
*/
async function addPublicContentOnVersionedNotulen(zitting, notulenUri, publicBehandelingUris) {
  console.log(`Enriching versioned notulen ${notulenUri} with public content only publishing behandelingen ${JSON.stringify(publicBehandelingUris)}`);

  let publicBehandelingUrisStatement = '';
  if (publicBehandelingUris && publicBehandelingUris.length) {
    const uris = publicBehandelingUris.map(uri => sparqlEscapeUri(uri)).join(', ');
    publicBehandelingUrisStatement = `${sparqlEscapeUri(notulenUri)} ext:publicBehandeling ${uris} .`;
  }

  const publicNotulenContent = await extractNotulenContentFromZitting( zitting, publicBehandelingUris);
  await update(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    DELETE {
      ${sparqlEscapeUri(notulenUri)} ext:publicContent ?publicContent ;
                                     ext:publicBehandeling ?publicBehandeling .
    } WHERE {
      ${sparqlEscapeUri(notulenUri)} a ext:VersionedNotulen.
      OPTIONAL { ${sparqlEscapeUri(notulenUri)} ext:publicBehandeling ?publicBehandeling . }
    }

    ;

    INSERT DATA {
      ${sparqlEscapeUri(notulenUri)} ext:publicContent ${hackedSparqlEscapeString(publicNotulenContent)} .
      ${publicBehandelingUrisStatement}
    }
  `);
};


export { ensureVersionedNotulenForZitting, extractNotulenContentFromZitting, signVersionedNotulen, publishVersionedNotulen };
