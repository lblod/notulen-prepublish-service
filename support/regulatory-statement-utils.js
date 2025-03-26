import { handleVersionedResource } from './pre-importer.js';
import { query, update, sparqlEscapeUri } from './sparql.js';
import { DOCUMENT_PUBLISHED_STATUS } from './constants.js';
/** @import EditorDocument from './editor-document' */
import VersionedRegulatoryStatement from '../models/versioned-regulatory-statement.js';

/**
 *
 * @param {EditorDocument} regulatoryStatementDocument An editor document object representing the regulatory statement
 * @param {string} versionedTreatmentUri The URI of the versioned treatment the regulatory statement belongs to.
 * @returns {Promise<string>} The URI of the newly created or already existing versioned regulatory statement.
 */
export async function ensureVersionedRegulatoryStatement(
  regulatoryStatementDocument,
  versionedTreatmentUri
) {
  const versionedRegulatoryStatement = await VersionedRegulatoryStatement.query(
    { regulatoryStatementDocumentUri: regulatoryStatementDocument.uri }
  );
  if (versionedRegulatoryStatement) {
    console.log(
      `reusing versioned extract for regulatory statement document with uuid  ${regulatoryStatementDocument.uri}`
    );
    return versionedRegulatoryStatement.uri;
  } else {
    const html = regulatoryStatementDocument.content;
    const versionedRegulatoryStatement =
      await VersionedRegulatoryStatement.create({
        regulatoryStatementDocumentUri: regulatoryStatementDocument.uri,
        versionedTreatmentUri,
        html,
      });
    return versionedRegulatoryStatement.uri;
  }
}

/**
 *
 * Function responsible for signing a given versioned regulatory statement
 *
 * @param {string} uri The URI of the versioned regulatory statement that should be signed
 * @param {string} sessionId
 * @param {string} targetStatus New state of versioned regulatory statement
 */
export async function signVersionedRegulatoryStatement(
  uri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    'signature',
    uri,
    sessionId,
    targetStatus,
    'ext:signsRegulatoryStatement'
  );
}

/**
 *
 * Function responsible for publishing a given versioned regulatory statement
 *
 * @param {string} uri The URI of the versioned regulatory statement that should be published
 * @param {string} sessionId
 * @param {string} targetStatus New state of versioned regulatory statement
 */
export async function publishVersionedRegulatoryStatement(
  uri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    'publication',
    uri,
    sessionId,
    targetStatus,
    'ext:publishedRegulatoryStatement'
  );
  await updateStatusOfLinkedEditorDocument(uri);
}

/**
 *
 * Updates the status to `published` of the editor document linked to a given versioned regulatory statement.
 *
 * @param {string} versionedRegulatoryStatementUri The URI of the versioned regulatory statement
 */
export async function updateStatusOfLinkedEditorDocument(
  versionedRegulatoryStatementUri
) {
  const editorDocumentQuery = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    SELECT ?editorDocument WHERE  {
    ${sparqlEscapeUri(
      versionedRegulatoryStatementUri
    )} a ext:VersionedRegulatoryStatement;
        ext:regulatoryStatement ?editorDocument.
    }
  `);
  if (!editorDocumentQuery.results.bindings.length)
    throw new Error(
      'Editor document not found for versioned reglementaire bijlage ' +
        versionedRegulatoryStatementUri
    );
  const editorDocumentUri =
    editorDocumentQuery.results.bindings[0].editorDocument.value;
  await update(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      ${sparqlEscapeUri(editorDocumentUri)} ext:editorDocumentStatus ?status
    } INSERT {
      ${sparqlEscapeUri(
        editorDocumentUri
      )} ext:editorDocumentStatus ${sparqlEscapeUri(DOCUMENT_PUBLISHED_STATUS)}
    } WHERE {
      ${sparqlEscapeUri(editorDocumentUri)} ext:editorDocumentStatus ?status
    }
  `);
}
