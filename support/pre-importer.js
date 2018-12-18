import {
  query, update, sparqlEscapeUri, sparqlEscapeString, uuid
} from  'mu';

import { findAllNodesOfType } from './dom-helpers';

/**
 * Extracts the Agenda's content from the supplied document.
 */
async function extractAgendaContentFromDoc( doc ) {
  // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
  const agendapuntNodes = findAllNodesOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Agendapunt' );
  return `<div class="agendapunten">${agendapuntNodes.map( (n) => n.outerHTML ).join("\n")}</div>`;
}

/**
 * Creates an agenda item in the triplestore which could be signed.
 */
async function preImportAgendaFromDoc( doc ) {
  // TODO remove (or move) relationship between previously signable
  // agenda, and the current agenda.

  // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
  const agendaContent = await extractAgendaContentFromDoc( doc );
  const agendaUuid = uuid();
  const agendaUri = `http://lblod.info/prepublished-agendas/${agendaUuid}`;

  // Create the new prepublished agenda, and dump it in to the store
  const updatePromise = update( `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>

    INSERT {
      ${sparqlEscapeUri(agendaUri)}
         a ext:PrePublishedAgenda;
         ext:content ${sparqlEscapeString( agendaContent )};
         ext:editorDocumentContext ?context;
         mu:uuid ${sparqlEscapeString( agendaUuid )}.
      ?documentContainer ext:hasPrepublishedAgenda ${sparqlEscapeUri(agendaUri)}
    } WHERE {
      ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                  ext:editorDocumentContext ?context.
    }`);

  const response = await updatePromise;
  return response; // should we return this?
};

export { extractAgendaContentFromDoc, preImportAgendaFromDoc };
