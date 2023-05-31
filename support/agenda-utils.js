import { PUBLISHER_TEMPLATES } from './setup-handlebars';
import { prefixes } from './prefixes';
import Meeting from '../models/meeting';
import AgendaPoint from '../models/agendapoint';
import VersionedAgenda from '../models/versioned-agenda';
import Concept from '../models/concept';
import { handleVersionedResource } from './pre-importer';
/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 */

/**
 * gather all data required to build an agenda
 */
async function getDataForAgenda(meetingUuid, agendaKindUuid) {
  const meeting = await Meeting.find(meetingUuid);
  const agendapoints = await AgendaPoint.findAll({ meetingUuid: meetingUuid });
  if (agendaKindUuid) {
    const agendaType = await Concept.find(agendaKindUuid);
    ensureAgendapointType(agendapoints, agendaType);
  }
  return { meeting, agendapoints };
}

export function ensureAgendapointType(agendapoints, type) {
  for (const agendapoint of agendapoints) {
    if (!agendapoint.type) {
      agendapoint.type = type.uri;
      agendapoint.typeName = type.label;
    }
  }
}
/**
 * This file contains helpers for exporting, signing and publishing content from the agenda.
 * @returns {Promise<string>}
 */
export async function constructHtmlForAgenda(
  meetingUuid,
  agendaKindUuid = null
) {
  const { meeting, agendapoints } = await getDataForAgenda(
    meetingUuid,
    agendaKindUuid
  );
  return constructHtmlForAgendaFromData(meeting, agendapoints);
}

export function constructHtmlForAgendaFromData(meeting, agendapoints) {
  const template = PUBLISHER_TEMPLATES.get('agenda');
  return template({ meeting, agendapoints, prefixes: prefixes.join(' ') });
}

/**
 *
 * @param {string} meetingUuid
 * @param {string} agendaKindUuid
 * @return {Promise<string>}
 */
export async function ensureVersionedAgendaForMeeting(
  meetingUuid,
  agendaKindUuid
) {
  const agendaType = await Concept.find(agendaKindUuid);
  let versionedAgenda = await VersionedAgenda.query({
    meetingUuid,
    agendaType: agendaType.label,
  });
  if (versionedAgenda) {
    console.log(`Reusing versioned agenda ${versionedAgenda.uri}`);
    return versionedAgenda.uri;
  } else {
    const { meeting, agendapoints } = await getDataForAgenda(
      meetingUuid,
      agendaKindUuid
    );
    const html = constructHtmlForAgendaFromData(meeting, agendapoints);
    versionedAgenda = await VersionedAgenda.create({
      meeting: meeting.uri,
      agendapoints,
      agendaType: agendaType.label,
      html,
    });
  }
  return versionedAgenda.uri;
}

export async function signVersionedAgenda(
  versionedAgendaUri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    'signature',
    versionedAgendaUri,
    sessionId,
    targetStatus,
    'ext:signsAgenda',
    'bv:agendaStatus',
    'ext:renderedContent'
  );
}

export async function publishVersionedAgenda(
  versionedAgendaUri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    'publication',
    versionedAgendaUri,
    sessionId,
    targetStatus,
    'ext:publishesAgenda',
    'bv:agendaStatus',
    'ext:renderedContent'
  );
}
