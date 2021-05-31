import Handlebars from "handlebars";
import { readFileSync } from 'fs';
import { join } from 'path';
import {prefixes} from "./prefixes";
import Meeting from '../models/meeting';
import AgendaPoint from '../models/agendapoint';
import VersionedAgenda from '../models/versioned-agenda';
import Concept from '../models/concept';
import {handleVersionedResource} from './pre-importer';
/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 */

/**
 * gather all data required to build an agenda
 */
async function getDataForAgenda(meetingUuid, agendaKindUuid) {
  const meeting = await Meeting.findUuid(meetingUuid);
  const agendapoints = await AgendaPoint.findAll({meetingUuid: meetingUuid});
  if (agendaKindUuid) {
    const agendaType = await Concept.find(agendaKindUuid);
    for (const agendapoint of agendapoints) {
      if (! agendapoint.type) {
        agendapoint.type = agendaType.uri;
        agendapoint.typeName = agendaType.label;
      }
    }
  }
  return { meeting, agendapoints };
}
/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 * @param {Support.Zitting} zitting
 * @returns {Promise<string>}
 */
export async function constructHtmlForAgenda(meetingUuid, agendaKindUuid = null) {
  const {meeting, agendapoints} = await getDataForAgenda(meetingUuid, agendaKindUuid);
  return constructHtmlForAgendaFromData(meeting, agendapoints);
}


function constructHtmlForAgendaFromData(meeting, agendapoints) {
  const templateStr = readFileSync(join(__dirname, "templates/agenda-prepublish.hbs")).toString();
  const template = Handlebars.compile(templateStr);
  return template({meeting, agendapoints, prefixes: prefixes.join(" ")});
}

/**
 *
 * @param {Zitting} zitting
 * @param {string} agendaKind
 * @return {Promise<string>}
 */
export async function ensureVersionedAgendaForMeeting(meetingUuid, agendaKindUuid) {
  const agendaType = await Concept.find(agendaKindUuid);
  let versionedAgenda = await VersionedAgenda.query({meetingUuid, agendaType: agendaType.label});
  if (versionedAgenda) {
    console.log(`Reusing versioned agenda ${versionedAgenda.uri}`);
    return versionedAgenda;
  }
  else {
    const {meeting, agendapoints} = await getDataForAgenda(meetingUuid, agendaKindUuid);
    const html = constructHtmlForAgendaFromData(meeting, agendapoints);
    versionedAgenda = await VersionedAgenda.create({ meeting: meeting.uri, agendaType: agendaType.label, html});
  }
  return versionedAgenda.uri;
}

export async function signVersionedAgenda(versionedAgendaUri, sessionId, targetStatus) {
  await handleVersionedResource(
    "signature",
    versionedAgendaUri,
    sessionId,
    targetStatus,
    "ext:signsAgenda",
    "bv:agendaStatus",
    "ext:renderedContent"
  );
}

export async function publishVersionedAgenda(versionedAgendaUri, sessionId, targetStatus) {
  await handleVersionedResource(
    "publication",
    versionedAgendaUri,
    sessionId,
    targetStatus,
    "ext:publishesAgenda",
    "bv:agendaStatus",
    "ext:renderedContent"
  );
}
