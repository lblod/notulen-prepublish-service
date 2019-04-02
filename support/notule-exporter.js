import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import { findFirstNodeOfType, findAllNodesOfType } from '@lblod/marawa/dist/dom-helpers';
import {wrapZittingInfo, handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';

function removePrivateBehandelingenFromZitting( node, publicBehandelingUris ) {
  const behandelingNodes = node.querySelectorAll("[typeof='besluit:BehandelingVanAgendapunt']");

  behandelingNodes.forEach(function(behandeling) {
    const uri = behandeling.attributes['resource'] && behandeling.attributes['resource'].value;
    if (!publicBehandelingUris.includes(uri)) {
      const behandelingHtml = [
        'besluit:gebeurtNa',
        'besluit:openbaar',
        'dc:subject'
      ].map(prop => behandeling.querySelector(`[property='${prop}']`))
            .filter(n => n != null)
            .map(n => n.outerHTML)
            .join();

      behandeling.innerHTML = behandelingHtml;
    }
  });
}

/**
 * This file contains helpers for exporting, signing and publishing content from the notule.
 */

/**
 * Extracts the Notulen content from the supplied document
 * Returns an HTML+RDFa snippet containing the zitting content
 * If a list of publicBehandelingUris is passed, the snippet will contain only those behandelingen.
 * If publicBehandelingUris is null, the snippet will contain all behandelingen.
 */
async function extractNotulenContentFromDoc( doc, publicBehandelingUris ) {
  const node = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );

  if (publicBehandelingUris != null) {
    removePrivateBehandelingenFromZitting(node);
  }

  if (node) {
    // TODO add helper function for prefixes
    var prefix = "";
    for( var key of Object.keys(doc.context.prefix) )
      prefix += `${key}: ${doc.context.prefix[key]} `;
    return `<div class="notulen" prefix="${prefix}">${node.outerHTML}</div>`;
  } else {
    throw new Error(`Cannot find node of type 'http://data.vlaanderen.be/ns/besluit#Zitting' in document ${doc.uri}`);
  }  
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
 * The content of the signed and public notulen may differ,
 * hence we create seperate predicates for the content to be signed and to be published.
 */
async function ensureVersionedNotulenForDoc( doc, notulenKind, type, publicBehandelingUris ) {
  // TODO remove (or move) relationship between previously signable notulen, and the current notulen.
  const ensurePublicContentOnVersionedNotulen = async function(notulenUri) {
    if (type == 'publication') {
      console.log(`Enriching versioned notulen ${notulenUri} with public content`);      
      let publicBehandelingUrisStatement = '';
      if (publicBehandelingUris && publicBehandelingUris.length) {
        const uris = publicBehandelingUris.map(uri => sparqlEscapeUri(uri)).join(', ');
        publicBehandelingUrisStatement = `${sparqlEscapeUri(notulenUri)} ext:publicBehandeling ${uris} .`;
      }

      const publicNotulenContent = await extractNotulenContentFromDoc( doc, publicBehandelingUris );
      await update(`
        PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

        INSERT {
          GRAPH ?g {
            ${sparqlEscapeUri(notulenUri)} ext:publicContent ${hackedSparqlEscapeString(publicNotulenContent)} .
            ${publicBehandelingUrisStatement}
          }
        } WHERE {
          GRAPH ?g {
            ${sparqlEscapeUri(notulenUri)} a ext:VersionedNotulen .
          }
        }
    `);
    }    
  };

  const previousId = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX sign: <http://mu.semte.ch/vocabularies/ext/signing/>

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
    ensurePublicContentOnVersionedNotulen(versionedNotulenId);
    return versionedNotulenId;
  } else {
    console.log(`Creating a new versioned notulen for ${doc.uri}`);    
    const notulenContent = await extractNotulenContentFromDoc( doc, publicBehandelingUris );
    const notulenUuid = uuid();
    const notulenUri = `http://data.lblod.info/prepublished-notulen/${notulenUuid}`;

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
    ensurePublicContentOnVersionedNotulen(notulenUri);
    
    return notulenUri;
  }
};

export { ensureVersionedNotulenForDoc, extractNotulenContentFromDoc, signVersionedNotulen, publishVersionedNotulen };
