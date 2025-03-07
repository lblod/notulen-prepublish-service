import Decision from "../models/decision.js";
/**
 * @import Treatment from '../models/treatment'
 */

const errorMessages = {
  nl: {
    besluitTypeRequired: (/** @type {string} */ title) =>
      `Besluit met titel "${title}" heeft nog geen type, een type is vereist om besluiten correct te publiceren`,
  },
  en: {
    besluitTypeRequired: (/** @type {string} */ title) =>
      `Decision with title "${title}" does not have a type yet, a type is required to properly publish decisions.`,
  },
};

/**
 * @param {Treatment} treatment
 */
export default async function validateTreatment(treatment) {
  const errors = [];
  const documentId = treatment.editorDocumentUuid;
  if (documentId) {
    const decisions = await Decision.extractDecisionsFromDocument(documentId);
    for (let decision of decisions) {
      if (
        !decision.typesAsText.includes(
          'https://data.vlaanderen.be/id/concept/BesluitType/'
        )
      ) {
        errors.push(errorMessages.nl.besluitTypeRequired(decision.title));
      }
    }
  }
  return errors;
}
