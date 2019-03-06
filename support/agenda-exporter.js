import {query, update, sparqlEscapeUri, sparqlEscapeString, uuid} from  'mu';
import {findFirstNodeOfType, findAllNodesOfType} from '@lblod/marawa/dist/dom-helpers';
import {wrapZittingInfo, handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';

/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 */

/**
 * Extracts the Agenda's content from the supplied document
 * Returns an HTML+RDFa snippet containing the zitting with its agendapunten
 */
async function extractAgendaContentFromDoc( doc ) {
  const node = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );

  if (node) {
    // TODO add helper function for prefixes    
    var prefix = "";
    for( var key of Object.keys(doc.context.prefix) )
      prefix += `${key}: ${doc.context.prefix[key]} `;
    
    const agendapuntNodes = findAllNodesOfType( node , 'http://data.vlaanderen.be/ns/besluit#Agendapunt' );
    const innerHTML = `${agendapuntNodes.map( (n) => n.outerHTML ).join("\n")}`;
    return `<div class="agendapunten" prefix="${prefix}">${wrapZittingInfo(doc, innerHTML)}</div>`;
  } else {
    throw new Error(`Cannot find node of type 'http://data.vlaanderen.be/ns/besluit#Zitting' in document ${doc.uri}`);
  }
}

/**
 * Creates a versioned agenda item in the triplestore which could be signed. 
 * The versioned agenda are attached to the document container.
 */
async function ensureVersionedAgendaForDoc( doc, agendaKind ) {
  // TODO remove (or move) relationship between previously signable agenda, and the current agenda.

  const previousId = await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>

    SELECT ?agendaUri
    WHERE {
      ?agendaUri
         a ext:VersionedAgenda;
         prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
         ext:agendaKind ${sparqlEscapeString( agendaKind )}.
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedAgendaId = previousId.results.bindings[0].agendaUri.value;
    console.log(`Reusing versioned agenda ${versionedAgendaId}`);
    return versionedAgendaId;
  } else {
    console.log(`Creating a new versioned agenda for ${doc.uri}`);
    const agendaContent = await extractAgendaContentFromDoc( doc );
    const agendaUuid = uuid();
    const agendaUri = `http://data.lblod.info/prepublished-agendas/${agendaUuid}`;

    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(agendaUri)}
           a ext:VersionedAgenda;
           ext:content ${hackedSparqlEscapeString( agendaContent )};
           prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
           mu:uuid ${sparqlEscapeString( agendaUuid )};
           ext:agendaKind ${sparqlEscapeString( agendaKind )}.
        ?documentContainer ext:hasVersionedAgenda ${sparqlEscapeUri(agendaUri)}.
      } WHERE {
        ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                    ext:editorDocumentContext ?context.
      }`);

    return agendaUri;
  }
};


async function signVersionedAgenda( versionedAgendaUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedAgendaUri, sessionId, targetStatus, 'ext:signsAgenda');
}

async function publishVersionedAgenda( versionedAgendaUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedAgendaUri, sessionId, targetStatus, 'ext:publishesAgenda');
}

export {
  signVersionedAgenda,
  publishVersionedAgenda,
  extractAgendaContentFromDoc,
  ensureVersionedAgendaForDoc
}
