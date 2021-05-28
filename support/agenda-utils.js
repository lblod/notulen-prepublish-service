import Handlebars from "handlebars";
import {prefixes, prefixMap} from "./prefixes";
import Meeting from '../models/meeting';
import AgendaPoint from '../models/agendapoint';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 */

/**
 * gather all data required to build an agenda
 */
async function getDataForAgenda(meetingUuid, agendaKind) {
  const meeting = await Meeting.findUuid(meetingUuid);
  const agendapoints = await AgendaPoint.findAll({meetingUuid: meetingUuid});
  return { meeting, agendapoints };
}
/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 * @param {Support.Zitting} zitting
 * @returns {Promise<string>}
 */
export async function constructHtmlForAgenda(meetingUuid, agendaKind = null) {
  const {meeting, agendapoints} = await getDataForAgenda(meetingUuid, agendaKind);
  const templateStr = readFileSync(join(__dirname, "templates/agenda-prepublish.hbs")).toString();
  const template = Handlebars.compile(templateStr);
  return template({meeting, agendapoints, prefixes: prefixes.join(" ")});
}
