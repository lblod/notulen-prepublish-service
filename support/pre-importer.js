import {
  query, update, sparqlEscapeUri, sparqlEscapeString, uuid
} from  'mu';

import { findAllNodesOfType } from './dom-helpers';

async function preImportAgendaFromDoc( doc ) {
  // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
  const agendapuntNodes = findAllNodesOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Agendapunt' );
  const content = `<div class="agendapunten">${agendapuntNodes.map( (n) => n.outerHTML ).join("\n")}</div>`;
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
         ext:content ${sparqlEscapeString( content )};
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

export { preImportAgendaFromDoc };
