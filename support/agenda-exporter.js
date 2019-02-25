import mu from 'mu';

import {query, update} from 'mu';
import {sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid} from  'mu';
import {findFirstNodeOfType, findAllNodesOfType} from '@lblod/marawa/dist/dom-helpers';
import {wrapZittingInfo, handleVersionedResource} from './pre-importer';

/**
 * Extracts the Agenda's content from the supplied document.
 */
async function extractAgendaContentFromDoc( doc ) {
  // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
  var prefix = "";
  for( var key of Object.keys(doc.context.prefix) )
    prefix += `${key}: ${doc.context.prefix[key]} `;
  const node = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );
  const agendapuntNodes = findAllNodesOfType( node , 'http://data.vlaanderen.be/ns/besluit#Agendapunt' );
  const innerHTML = `${agendapuntNodes.map( (n) => n.outerHTML ).join("\n")}`;
  return `<div class="agendapunten" prefix="${prefix}">${wrapZittingInfo(doc, innerHTML)}</div`;
}

/**
 * Creates an agenda item in the triplestore which could be signed.
 */
async function ensureVersionedAgendaForDoc( doc, agendaKind ) {
  // TODO remove (or move) relationship between previously signable
  // agenda, and the current agenda.

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
    console.log("Creating new VersionedAgenda");
    // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
    const agendaContent = await extractAgendaContentFromDoc( doc );
    const agendaUuid = uuid();
    const agendaUri = `http://lblod.info/prepublished-agendas/${agendaUuid}`;

    // Create the new prepublished agenda, and dump it in to the store
    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(agendaUri)}
           a ext:VersionedAgenda;
           ext:content ${sparqlEscapeString( agendaContent )};
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
