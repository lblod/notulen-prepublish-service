import Handlebars from 'handlebars';
import {readFileSync} from 'fs';
import {join} from 'path';

export default function setupHandleBars() {
  const templateStr = readFileSync(join(__dirname, 'templates/mandatee-list.hbs')).toString();
  Handlebars.registerPartial('mandateeList', templateStr);
}
