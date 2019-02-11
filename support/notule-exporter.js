import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import { findFirstNodeOfType, findAllNodesOfType } from '@lblod/marawa/dist/dom-helpers';
import {wrapZittingInfo, handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';

/**
 * This file contains helpers for exporting, signing and publishing content from the notule.
 */



// NOTULEN
/**
 * Extracts the notulen content from the supplied document.
 */
async function extractNotulenContentFromDoc( doc ) {
  // Find all zitting nodes, wrap them in a separate node, and push the information onto the DocumentContainer
  const node = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );
  var prefix = "";
  for( var key of Object.keys(doc.context.prefix) )
    prefix += `${key}: ${doc.context.prefix[key]} `;
  return `<div class="notulen" prefix="${prefix}">${node.outerHTML}</div>`;
}


async function signVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedNotulenUri, sessionId, targetStatus, 'ext:signsNotulen');
}

async function publishVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedNotulenUri, sessionId, targetStatus, 'ext:publishesNotulen');
}


/**
 * Creates an notulen item in the triplestore which could be signed.
 */
async function ensureVersionedNotulenForDoc( doc, notulenKind ) {
  // TODO remove (or move) relationship between previously signable
  // notulen, and the current notulen.

  const previousId = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>

    SELECT ?notulenUri
    WHERE {
      ?notulenUri
         a ext:VersionedNotulen;
         prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
         ext:notulenKind ${sparqlEscapeString( notulenKind )}.
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedNotulenId = previousId.results.bindings[0].notulenUri.value;
    console.log(`Reusing versioned notulen ${versionedNotulenId}`);
    return versionedNotulenId;
  } else {
    console.log("Creating new VersionedNotulen");
    // Find all notulenpunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
    const notulenContent = await extractNotulenContentFromDoc( doc );
    const notulenUuid = uuid();
    const notulenUri = `http://lblod.info/prepublished-notulens/${notulenUuid}`;

    // Create the new prepublished notulen, and dump it in to the store
    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(notulenUri)}
           a ext:VersionedNotulen;
           ext:content ${hackedSparqlEscapeString(notulenContent)};
           prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
           mu:uuid ${sparqlEscapeString( notulenUuid )};
           ext:notulenKind ${sparqlEscapeString( notulenKind )}.
        ?documentContainer ext:hasVersionedNotulen ${sparqlEscapeUri(notulenUri)}.
      } WHERE {
        ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                    ext:editorDocumentContext ?context.
      }`);

    return notulenUri;
  }
};

export { ensureVersionedNotulenForDoc, extractNotulenContentFromDoc, signVersionedNotulen, publishVersionedNotulen};
