import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import { findFirstNodeOfType, findAllNodesOfType } from '@lblod/marawa/dist/dom-helpers';
import {wrapZittingInfo, handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';

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
    removePrivateBehandelingenFromZitting(node, publicBehandelingUris);
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
 * The content of the versioned notulen always contains the full Zitting from the document
 * Additionally, on publication the versioned notulen also gets a public-content property containing
 * only the behandelingen that are public.
 */
async function ensureVersionedNotulenForDoc( doc, notulenKind, type, publicBehandelingUris ) {
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
         a ext:VersionedNotulen;
         prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
         ext:notulenKind ${sparqlEscapeString( notulenKind )}.
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedNotulenId = previousId.results.bindings[0].notulenUri.value;
    console.log(`Reusing versioned notulen ${versionedNotulenId}`);
    if (type == 'publication')
      addPublicContentOnVersionedNotulen(doc, versionedNotulenId, publicBehandelingUris);
    return versionedNotulenId;
  } else {
    console.log(`Creating a new versioned notulen for ${doc.uri}`);
    const notulenContent = await extractNotulenContentFromDoc( doc );
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

    if (type == 'publication')    
      addPublicContentOnVersionedNotulen(doc, notulenUri, publicBehandelingUris);

    return notulenUri;
  }
};

/**
 * Sets the public-content of a versioned notulen containing only the public behandeling of the Zitting
*/
async function addPublicContentOnVersionedNotulen(doc, notulenUri, publicBehandelingUris) {
  console.log(`Enriching versioned notulen ${notulenUri} with public content only publishing behandelingen ${JSON.stringify(publicBehandelingUris)}`);
  
  let publicBehandelingUrisStatement = '';
  if (publicBehandelingUris && publicBehandelingUris.length) {
    const uris = publicBehandelingUris.map(uri => sparqlEscapeUri(uri)).join(', ');
    publicBehandelingUrisStatement = `${sparqlEscapeUri(notulenUri)} ext:publicBehandeling ${uris} .`;
  }

  const publicNotulenContent = await extractNotulenContentFromDoc( doc, publicBehandelingUris );
  await update(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    DELETE {
      ${sparqlEscapeUri(notulenUri)} ext:publicContent ?publicContent ;
                                     ext:publicBehandeling ?publicBehandeling .
    } WHERE {
      ${sparqlEscapeUri(notulenUri)} a ext:VersionedNotulen ;
           ext:publicContent ?publicContent .
      OPTIONAL { ${sparqlEscapeUri(notulenUri)} ext:publicBehandeling ?publicBehandeling . }
    }

    ;

    INSERT DATA {
      ${sparqlEscapeUri(notulenUri)} ext:publicContent ${hackedSparqlEscapeString(publicNotulenContent)} .
      ${publicBehandelingUrisStatement}
    }
  `);
};

/**
 * Replaces the non-public behandelingen of a Zitting with annotated placeholder content.
 * The placeholder content only contains the strictly necessary RDFa annotations.
 */
function removePrivateBehandelingenFromZitting( node, publicBehandelingUris ) {
  const behandelingNodes = node.querySelectorAll("[typeof='besluit:BehandelingVanAgendapunt']");

  behandelingNodes.forEach(function(behandeling) {
    const uri = behandeling.attributes['resource'] && behandeling.attributes['resource'].value;
    if (!publicBehandelingUris.includes(uri)) {
      let behandelingHtml = [
        'besluit:gebeurtNa',
        'besluit:openbaar',
        'dc:subject'
      ].map(prop => behandeling.querySelector(`[property='${prop}']`))
          .filter(n => n != null)
          .map(n => n.outerHTML)
          .join('');
      behandelingHtml += `<span property="ext:isPrivateBehandeling" content="true" dataType="xsd:boolean">&nbsp;</span>`;
      
      console.log(`Inner HTML of private behandeling ${uri} will be replaced with ${behandelingHtml}`);
      behandeling.innerHTML = behandelingHtml;
    }
  });
}


export { ensureVersionedNotulenForDoc, extractNotulenContentFromDoc, signVersionedNotulen, publishVersionedNotulen };
