const errorMessages = {
  nl: {
    besluitTypeRequired: (title) => `Besluit met titel "${title}" heeft nog geen type, een type is vereist om besluiten correct te melden bij het digitaal loket`
  },
  en: {
    besluitTypeRequired: (title) => `Decision with title "${title}" does not have a type yet, a type is required to properly submit decisions to digitaal loket.`
  }
}

export default function validateBehandeling(agendapunt) {
  const errors = [];
  const document = agendapunt.behandeling.document.content;
  const documentNode = new jsdom.JSDOM(document).window.document;
  const documentContainers = documentNode.querySelectorAll(`[property='prov:generated']`);
  for(let i = 0; i < documentContainers.length; i++) {
    const documentContainer = documentContainers[i];
    const typeOf = documentContainer ? documentContainer.getAttribute('typeof') : '';
    const isBesluit = typeOf.includes('besluit:Besluit');
    if(isBesluit) {
      const containsBesluitType = typeOf.includes('besluittype:');
      if(!containsBesluitType) {
        const titleContainer = documentContainer.querySelector(`[property='eli:title']`);
        const title = titleContainer.textContent;
        errors.push(errorMessages.nl.besluitTypeRequired(title));
      }
    }
  }
  return errors;
}