// @ts-ignore
import { query, sparqlEscapeUri } from 'mu';
import AgendaPoint from '../models/agendapoint';
import Concept from '../models/concept';
import Intermission from '../models/intermission';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import VersionedNotulen from '../models/versioned-notulen';
import { ensureAgendapointType } from './agenda-utils';
import { IS_FINAL } from './constants';
import { buildExtractDataForTreatment } from './extract-utils';
import { handleVersionedResource } from './pre-importer';
import { prefixes } from "./prefixes";
import { fetchParticipationList, buildParticipantCache } from './query-utils';
import { PUBLISHER_TEMPLATES } from './setup-handlebars';
import validateMeeting from "./validate-meeting";
import validateTreatment from "./validate-treatment";
export const DRAFT_DECISON_PUBLISHED_STATUS = 'http://mu.semte.ch/application/concepts/ef8e4e331c31430bbdefcdb2bdfbcc06';
const PLANNED_AGENDAPOINT_TYPE_ID = "bdf68a65-ce15-42c8-ae1b-19eeb39e20d0";
export const NOTULEN_KIND_FULL="full";
export const NOTULEN_KIND_PUBLIC="public";

/**
 * This file contains helpers for exporting, signing and publishing content from the notule.
 */




export async function constructHtmlForMeetingNotes(meetingUuid, previewType) {
  const meeting = await Meeting.find(meetingUuid);
  const treatments = await Treatment.findAll({meetingUuid});
  let errors = validateMeeting(meeting);
  for (const treatment of treatments) {
    const treatmentErrors = await validateTreatment(treatment);
    errors = [...errors, ...treatmentErrors];
  }
  const meetingNotesData = await buildDataForMeetingNotes({meeting, treatments, previewType, allPublic: true});
  const html = constructHtmlForMeetingNotesFromData(meetingNotesData);
  return {errors, html};
}

export async function buildDataForMeetingNotes({meeting, treatments, previewType, publicTreatments = [], allPublic = false}) {
  const agendapoints = await AgendaPoint.findAll({meetingUuid: meeting.uuid});
  const defaultAgendaPointType = await Concept.find(PLANNED_AGENDAPOINT_TYPE_ID);
  ensureAgendapointType(agendapoints, defaultAgendaPointType);
  const participationList = await fetchParticipationList(meeting.uri);
  let participantCache;
  if (participationList) {
    participantCache = buildParticipantCache(participationList);
  }
  const intermissions = await Intermission.findAll({meetingUri: meeting.uri});
  const treatmentsData = await Promise.all(treatments.map(async (treatment) => {
    let isPublic = false;
    if (allPublic || publicTreatments.includes(treatment.uri)) {
      isPublic = true;
    }
    const data = await buildExtractDataForTreatment(treatment, meeting, previewType, isPublic, participantCache );
    return data;
  }));
  return {meeting, agendapoints, treatmentsData, intermissions, participationList};
}

export function constructHtmlForMeetingNotesFromData({meeting, agendapoints, treatmentsData, intermissions, participationList}) {
  const template = PUBLISHER_TEMPLATES.get("meetingNotes");
  const html = template({meeting, agendapoints, treatmentsData, intermissions, participationList, prefixes: prefixes.join(" ")});
  return html;
}


export async function ensureVersionedNotulen(meeting, treatments, kind, publicTreatments = []) {
  const versionedNotulen = await VersionedNotulen.query({meeting, kind});
  if (versionedNotulen) {
    console.log(`Reusing versioned notulen ${versionedNotulen.uri} of kind ${kind}`);
    return versionedNotulen.uri;
  }
  else {
    console.log(`Creating a new versioned notulen of kind ${kind} for ${meeting.uri}`);
    let html;
    if (kind === NOTULEN_KIND_FULL) {
      const data = await buildDataForMeetingNotes({meeting, treatments, previewType: IS_FINAL, allPublic: true});
      html = constructHtmlForMeetingNotesFromData(data);
    }
    else {
      const data = await buildDataForMeetingNotes({meeting, treatments, previewType: IS_FINAL, publicTreatments});
      html = constructHtmlForMeetingNotesFromData(data);
    }
    const versionedNotulen = await VersionedNotulen.create({meeting, html, kind, publicTreatments});
    return versionedNotulen.uri;
  }
}

export async function generateNotulenPreview(meeting, treatments, kind, publicTreatments = []) {
  let html;
  if (kind === NOTULEN_KIND_FULL) {
    const data = await buildDataForMeetingNotes({meeting, treatments, previewType: IS_FINAL, allPublic: true});
    html = constructHtmlForMeetingNotesFromData(data);
  }
  else {
    const data = await buildDataForMeetingNotes({meeting, treatments, previewType: IS_FINAL, publicTreatments});
    html = constructHtmlForMeetingNotesFromData(data);
  }
  return html;
}


export async function signVersionedNotulen( versionedNotulenUri, sessionId, targetStatus, attachments ) {
  await handleVersionedResource( "signature", versionedNotulenUri, sessionId, targetStatus, 'ext:signsNotulen', undefined, undefined, attachments);
}

export async function publishVersionedNotulen( versionedNotulenUri, sessionId, targetStatus, attachments) {
  await handleVersionedResource( "publication", versionedNotulenUri, sessionId, targetStatus, 'ext:publishesNotulen', undefined, undefined, attachments);
  await updateLinkedDocuments( versionedNotulenUri );
}

async function updateLinkedDocuments( versionedNotulenUri ) {
  await query(`
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX dct: <http://purl.org/dc/terms/>
    DELETE {
      ?container ext:editorDocumentStatus ?status
    } INSERT {
      ?container ext:editorDocumentStatus ${sparqlEscapeUri(DRAFT_DECISON_PUBLISHED_STATUS)}
    } WHERE {
      ?meeting ext:hasVersionedNotulen ${sparqlEscapeUri(versionedNotulenUri)};
                besluit:behandelt ?agendapunt.
      ?behandeling dct:subject ?agendapunt;
                    ext:hasDocumentContainer ?container.
      ?container ext:editorDocumentStatus ?status
    }
  `);
}
