import { uuid, query, update, sparqlEscapeUri, sparqlEscapeString } from 'mu';
import {wrapZittingInfo, handleVersionedResource, cleanupTriples, hackedSparqlEscapeString} from './pre-importer';
import {findFirstNodeOfType, findAllNodesOfType} from '@lblod/marawa/dist/dom-helpers';
import { analyse, resolvePrefixes } from '@lblod/marawa/dist/rdfa-context-scanner';

/**
 * Finds a versioned behandeling based on provided uri
 * does not check if it's linked to the right container
 */
async function findVersionedBehandeling(uri) {
  const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?versionedBehandeling ?body ?uuid
      WHERE
      {
        ?versionedBehandeling a ext:VersionedBehandeling;
                  mu:uuid ?uuid;
                  ext:content ?body;
                  prov:wasDerivedFrom ?editorDocument;
                  ext:behandeling ${sparqlEscapeUri(uri)}.
        ?editorContainer pav:hasVersion ?editorDocument.
      }
  `);
  const bindings = r.results.bindings;
  if (bindings.length > 0)
    return { body: bindings[0].body.value, behandeling: uri, uuid: bindings[0].uuid.value, versionedBehandeling: bindings[0].versionedBehandeling.value };
  else
    return null;
}

/**
 * extracts a behandeling from the supplied document
 * searches for a BehandelingVanAgendapunt in the document with a matching uri and returns that node
 */
function createBehandelingExtract(doc, behandeling, isWrappedInZittingInfo = true) {
  const behandelingNodes = findAllNodesOfType( doc.getTopDomNode(), "http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt" ).filter((node) => node.getAttribute('resource') === behandeling);
  if (behandelingNodes.length > 0 ) {
    var prefix = "";
    for( var key of Object.keys(doc.context.prefix) )
      prefix += `${key}: ${doc.context.prefix[key]} `;
    let body = "";
    if (isWrappedInZittingInfo) {
      body = `<div class="behandeling" prefix="${prefix}">${wrapZittingInfo(doc, behandelingNodes[0].outerHTML)}</div>`;
    } else {
      body = `<div class="behandeling" prefix="${prefix}">${behandelingNodes[0].outerHTML}</div>`;
    }
    return { body, behandeling };
  }
  throw "Behandeling not found";
}

/**
 * Creates a versioned behandeling in the triple store which could be signed or published
 * The versioned behandeling is attached to the document container
 */
async function ensureVersionedBehandelingForDoc(doc, behandelingUri) {
  const versionedBehandeling = await findVersionedBehandeling(behandelingUri);
  if (versionedBehandeling) {
    console.log(`reusing versioned behandeling for document ${doc.uri} and behandeling ${behandelingUri}`);
    return versionedBehandeling.versionedBehandeling;
  }
  else {
    console.log(`creating a new versioned behandeling for document ${doc.uri} and behandeling ${behandelingUri}`);
    const newExtract = createBehandelingExtract(doc, behandelingUri);
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
           ext:content ${hackedSparqlEscapeString( newExtract.body )};
           prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
           mu:uuid ${sparqlEscapeString( versionedBehandelingUuid )};
           ext:behandeling ${sparqlEscapeUri(behandelingUri)}.
        ?documentContainer ext:hasVersionedBehandeling ${sparqlEscapeUri(versionedBehandelingUri)}.
      } WHERE {
        ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                    ext:editorDocumentContext ?context.
      }`);
    return versionedBehandelingUri;
  }
}

/**
 * Returns extracts of behandelings van agendapunten, either extracted from the document or if it already exists in the store the version from the store.
 * NOTE: this is different from other extractions!
 * Returns an array of behandeling extractions
 */
async function extractBehandelingVanAgendapuntenFromDoc( doc, isWrappedInZittingInfo ) {
  const zitting = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );
  if (zitting) {
    const contexts = analyse( zitting ).map((c) => c.context);
    const triples = cleanupTriples(Array.concat(...contexts));
    const behandelingen = triples.filter((t) => t.predicate === "a" && t.object === "http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt").map( (b) => b.subject);
    const extracts = [];
    for (const behandeling of behandelingen) {
      const existingExtract = await findVersionedBehandeling(behandeling);
      if (existingExtract) {
        console.log(`returning existing behandeling for ${doc.uri}`);
        extracts.push(existingExtract);
      }
      else {
        const newExtract = createBehandelingExtract(doc, behandeling, isWrappedInZittingInfo);
        console.log(`creating temporary behandeling extract for ${doc.uri}`);
        extracts.push(newExtract);
      }
    }
    return extracts;
  }
  return [];
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
        FILTER EXISTS { ?versionedBehandeling ext:publishesBehandeling ?publishedResource }.
        LIMIT 1
      }
  `);
  return r.results.bindings.length > 0;
}

async function signVersionedBehandeling( versionedBehandelingUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedBehandelingUri, sessionId, targetStatus, 'ext:signsBehandeling');
}

async function publishVersionedBehandeling( versionedBehandelingUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedBehandelingUri, sessionId, targetStatus, 'ext:publishesBehandeling');
}

export { extractBehandelingVanAgendapuntenFromDoc, ensureVersionedBehandelingForDoc, isPublished, signVersionedBehandeling, publishVersionedBehandeling }
