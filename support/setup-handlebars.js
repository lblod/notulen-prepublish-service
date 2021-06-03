import Handlebars from 'handlebars';
import {readFileSync} from 'fs';
import {join} from 'path';

const templateNameToFile = {
  agenda: "templates/agenda-prepublish.hbs",
  decisionList: "templates/besluitenlijst-prepublish.hbs",
  meetingNotes: "templates/notulen-prepublish.hbs",
  treatment: "templates/behandeling-prepublish.hbs"
};

export const PUBLISHER_TEMPLATES = new Map();

export function setupHandleBars() {
  registerPartials();
  compileTemplates();
}

function compileTemplates() {
  for(const [key,filename] of Object.entries(templateNameToFile)) {
    const templateStr = readFileSync(join(__dirname, filename)).toString();
    const template = Handlebars.compile(templateStr, {strict: true});
    PUBLISHER_TEMPLATES.set(key, template);
  }
}

function registerPartials() {
  const templateStr = readFileSync(join(__dirname, 'templates/mandatee-list.hbs')).toString();
  Handlebars.registerPartial('mandateeList', templateStr);
}
