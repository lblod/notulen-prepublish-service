import Handlebars from 'handlebars';
import {readFileSync} from 'fs';
import {join} from 'path';

const templateNameToFile = {
  agenda: "agenda-prepublish.hbs",
  decisionList: "besluitenlijst-prepublish.hbs",
  meetingNotes: "notulen-prepublish.hbs",
  treatment: "behandeling-prepublish.hbs",
  extract: "extract.hbs",
  decisionsTitleAndDescriptionOnly: "decisions-title-and-descriptions-only.hbs"
};

const partialNameToFile = {
  mandateeList: "mandatee-list.hbs",
  treatment: "treatment.hbs"
};

export const PUBLISHER_TEMPLATES = new Map();

export function setupHandleBars() {
  registerPartials();
  compileTemplates();
}

function compileTemplates() {
  for(const [key,filename] of Object.entries(templateNameToFile)) {
    const templateStr = readFileSync(join(__dirname, "templates", filename)).toString();
    const template = Handlebars.compile(templateStr, {strict: true});
    PUBLISHER_TEMPLATES.set(key, template);
  }
}

function registerPartials() {
  for(const [key,filename] of Object.entries(partialNameToFile)) {
    const templateStr = readFileSync(join(__dirname, "templates", "partials", filename)).toString();
    Handlebars.registerPartial(key, templateStr);
  }
}
