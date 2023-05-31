/**
 * Represents an rdfa-document as entered by the user in the frontend.
 */

// @ts-ignore
import { query, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import jsdom from 'jsdom';
import { PUBLISHER_TEMPLATES } from './setup-handlebars';
import { IS_FINAL } from './constants';

class EditorDocument {
  constructor(content) {
    this.content = undefined;
    this.context = {};
    this.uri = undefined;
    for (var key in content) {
      this[key] = content[key];
    }
  }

  getDom() {
    if (this.dom) {
      return this.dom;
    } else {
      const dom = new jsdom.JSDOM(`<body>${this.content}</body>`);
      this.dom = dom;
      return dom;
    }
  }

  getTopDomNode() {
    if (this.topDomNode) {
      return this.topDomNode;
    } else {
      const dom = this.getDom();
      const topDomNode = dom.window.document.querySelector('body');
      topDomNode.setAttribute('vocab', this.context.vocab);
      topDomNode.setAttribute(
        'prefix',
        (() => {
          var str = '';
          for (var key in this.context.prefix)
            if (key != '') str += `${key}: ${this.context.prefix[key]} `;
          return str;
        })()
      );

      this.topDomNode = topDomNode;
      return topDomNode;
    }
  }

  resetDom() {
    this.dom = undefined;
    this.topDomNode = undefined;
  }
}

/**
 * Retrieves the EditorDocument belonging to the supplied uuid
 *
 * @method editorDocumentFromUuid
 *
 * @param {string} uuid UUID which is coupled to the EditorDocument as
 * mu:uuid property.
 *
 * @return {Promise<EditorDocument | null>} Promise which resolves to an object representing
 * the EditorDocument
 */
async function editorDocumentFromUuid(uuid, attachments, previewType) {
  // We have removed dc:title from here
  const queryResult = await query(
    `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT * WHERE {
       ?uri a <http://mu.semte.ch/vocabularies/ext/EditorDocument>;
            ext:editorDocumentContent ?content;
            ext:editorDocumentContext ?context;
            <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString(
              uuid
            )}
     }`
  );
  if (queryResult.results.bindings.length === 0) {
    console.log(`No content found for EditorDocument ${uuid} returning null`);
    return null;
  }
  const result = queryResult.results.bindings[0];
  const content = attachments
    ? appendAttachmentsToDocument(
        result.content.value,
        attachments,
        previewType
      )
    : result.content.value;
  const doc = new EditorDocument({
    uri: result.uri.value,
    // title: result.title,
    context: JSON.parse(result.context.value),
    content,
  });

  return doc;
}

/**
 * Retrieves the EditorDocument belonging to the supplied uri
 *
 * @method editorDocumentFromUuid
 *
 * @param {string} uri UUID which is coupled to the EditorDocument as
 * mu:uuid property.
 *
 * @return {Promise<EditorDocument | null>} Promise which resolves to an object representing
 * the EditorDocument
 */
export async function editorDocumentFromUri(uri) {
  const queryResult = await query(
    `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT * WHERE {
      ${sparqlEscapeUri(
        uri
      )} a <http://mu.semte.ch/vocabularies/ext/EditorDocument>;
            ext:editorDocumentContent ?content;
            ext:editorDocumentContext ?context.
     }`
  );
  if (queryResult.results.bindings.length === 0) {
    console.log(`No content found for EditorDocument ${uri} returning null`);
    return null;
  }
  const result = queryResult.results.bindings[0];
  const content = result.content.value;
  const doc = new EditorDocument({
    uri,
    context: JSON.parse(result.context.value),
    content,
  });

  return doc;
}

function appendAttachmentsToDocument(
  documentContent,
  attachments,
  previewType
) {
  const attachmentsGrouped = {};
  for (let attachment of attachments) {
    if (attachmentsGrouped[attachment.decision]) {
      attachmentsGrouped[attachment.decision].push(attachment);
    } else {
      attachmentsGrouped[attachment.decision] = [attachment];
    }
  }
  const dom = new jsdom.JSDOM(`<body>${documentContent}</body>`);
  for (let decisionKey in attachmentsGrouped) {
    const htmlToAdd = generateAttachmentPart(
      attachmentsGrouped[decisionKey],
      previewType
    );
    const decisionContainer = dom.window.document.querySelector(
      `[resource="${decisionKey}"]`
    );
    if (decisionContainer) {
      decisionContainer.insertAdjacentHTML('beforeend', htmlToAdd);
    }
  }
  return dom.window.document.body.innerHTML;
}

function generateAttachmentPart(attachmentGroup, previewType) {
  let publicationBaseUrl = '';
  if (process.env.PUBLICATION_BASE_URL && previewType === IS_FINAL) {
    publicationBaseUrl = process.env.PUBLICATION_BASE_URL;
  }
  const REGULATORY_ATTACHMENT_TYPE =
    'http://lblod.data.gift/concepts/14e264b4-92db-483f-9dd1-3e806ad6d26c';
  const attachments = attachmentGroup.map((attachment) => {
    attachment.isRegulatory = attachment.type === REGULATORY_ATTACHMENT_TYPE;
    attachment.link = `${publicationBaseUrl}/files/${attachment.fileUuid}/download`;
    return attachment;
  });
  const template = PUBLISHER_TEMPLATES.get('attachments');
  const html = template({ attachments });
  return html;
}

export default EditorDocument;
export { editorDocumentFromUuid, appendAttachmentsToDocument };
