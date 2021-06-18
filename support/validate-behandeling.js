import Decision from '../models/decision';
const errorMessages = {
  nl: {
    besluitTypeRequired: (title) => `Besluit met titel "${title}" heeft nog geen type, een type is vereist om besluiten correct te melden bij het digitaal loket`
  },
  en: {
    besluitTypeRequired: (title) => `Decision with title "${title}" does not have a type yet, a type is required to properly submit decisions to digitaal loket.`
  }
}

export default async function validateBehandeling(agendapunt) {
  const errors = [];
  const document = agendapunt.behandeling.document.uuid;
  const decisions = await Decision.extractDecisionsFromDocument(document);
  for(let decision of decisions) {
    if(!decision.typesAsText.includes('https://data.vlaanderen.be/id/concept/BesluitType/')) {
      errors.push(errorMessages.nl.besluitTypeRequired(decision.title))
    }
  }
  return errors;
}