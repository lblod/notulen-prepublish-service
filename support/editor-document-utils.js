// @ts-strict-ignore

import { query, sparqlEscapeUri } from 'mu';
import EditorDocument from './editor-document';

/**
 *
 * Fetches the current version of a document container and returns it as an `EditorDocument` object
 *
 * @param {string} documentContainerUri The URI of the document container
 * @returns {Promise<EditorDocument>}
 */
export async function getCurrentVersion(documentContainerUri) {
  const currentVersionQuery = await query(`
      PREFIX pav: <http://purl.org/pav/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      SELECT ?uri ?content ?context WHERE  {
      ${sparqlEscapeUri(documentContainerUri)} pav:hasCurrentVersion ?uri .
      ?uri ext:editorDocumentContent ?content;
                      ext:editorDocumentContext ?context.
      }
    `);
  if (!currentVersionQuery.results.bindings.length)
    throw new Error(
      'Current version not found for document container' + documentContainerUri
    );

  const result = currentVersionQuery.results.bindings[0];
  return new EditorDocument({
    uri: result.uri.value,
    context: JSON.parse(result.context.value),
    content: result.content.value,
  });
}

/**
 *
 * Function which yields a list of document container URIs which are part of a given editor-document
 *
 * @param {string} editorDocumentUri
 * @returns {Promise<string[]>}
 */
export async function getLinkedDocuments(editorDocumentUri) {
  const linkedStatementsQuery = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX dct: <http://purl.org/dc/terms/>
    SELECT ?part WHERE  {
      ?part dct:isPartOf ${sparqlEscapeUri(editorDocumentUri)} .
    }
  `);
  return linkedStatementsQuery.results.bindings.map(
    (binding) => binding.part.value
  );
}
