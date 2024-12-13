// @ts-strict-ignore

import Treatment from '../models/treatment';
import AgendaPoint from '../models/agendapoint';
import Meeting from '../models/meeting';
import StandardVote from '../models/standard-vote';
import CustomVote from '../models/custom-vote';
import Decision from '../models/decision';
import { query, sparqlEscapeUri, update } from 'mu';
import { prefixes } from './prefixes';
import {
  buildParticipantCache,
  fetchParticipationList,
  fetchParticipationListForTreatment,
  fetchTreatmentParticipantsWithCache,
} from './query-utils';
import { editorDocumentFromUuid } from './editor-document';
import { PUBLISHER_TEMPLATES } from './setup-handlebars';
import validateMeeting from './validate-meeting';
import validateTreatment from './validate-treatment';
import VersionedExtract from '../models/versioned-behandeling';
import { handleVersionedResource } from './pre-importer';
import { DOCUMENT_PUBLISHED_STATUS, IS_FINAL, IS_PREVIEW } from './constants';

// This file contains helpers for exporting, signing and publishing an extract of the meeting notes
// an extract is the treatment of one agendapoint and all it's related info

/**
 * @param {Treatment} treatment
 * @param {Meeting} meeting
 * @param {string[]} meetingErrors
 * @param {*} participantCache
 */
async function buildExtractForTreatment(
  treatment,
  meeting,
  meetingErrors,
  participantCache
) {
  const data = await buildExtractDataForTreatment(
    treatment,
    meeting,
    IS_PREVIEW,
    true,
    participantCache
  );
  const html = constructHtmlForExtract(data);
  const treatmentErrors = await validateTreatment(treatment);
  return {
    data: {
      attributes: {
        content: html,
        errors: [...meetingErrors, ...treatmentErrors],
        behandeling: treatment.uri,
        uuid: treatment.uuid,
      },
    },
  };
}

// here for legacy purposes
export async function buildAllExtractsForMeeting(meetingUuid) {
  const treatments = await Treatment.findAll({ meetingUuid });
  const meeting = await Meeting.find(meetingUuid);
  const participationList = await fetchParticipationList(meeting.uri);
  let participantCache;
  if (participationList) {
    participantCache = buildParticipantCache(participationList);
  }
  const meetingErrors = validateMeeting(meeting);
  const extractBuilders = treatments.map((treatment) =>
    buildExtractForTreatment(
      treatment,
      meeting,
      meetingErrors,
      participantCache
    )
  );
  const extracts = await Promise.all(extractBuilders);
  return extracts;
}

export async function buildExtractData(
  treatmentUuid,
  previewType,
  isPublic = true
) {
  const treatment = await Treatment.find(treatmentUuid);
  const meeting = await Meeting.findURI(treatment.meeting);
  return await buildExtractDataForTreatment(
    treatment,
    meeting,
    previewType,
    isPublic
  );
}

/**
 * @param {Treatment} treatment
 * @param {Meeting} meeting
 * @param {string} previewType
 * @param {boolean} [isPublic=true]
 * @param {any} [participantCache=null]
 */
export async function buildExtractDataForTreatment(
  treatment,
  meeting,
  previewType,
  isPublic = true,
  participantCache = null
) {
  const agendapoint = await AgendaPoint.findURI(treatment.agendapoint);
  let participationList;
  if (participantCache) {
    participationList = await fetchTreatmentParticipantsWithCache(
      treatment,
      participantCache
    );
  } else {
    participationList = await fetchParticipationListForTreatment(treatment.uri);
    if (participationList) {
      participantCache = buildParticipantCache(participationList);
    }
  }
  const standardVotes = await StandardVote.findAll({
    treatmentUri: treatment.uri,
  });
  const customVotes = await CustomVote.findAll({ treatmentUri: treatment.uri });
  const votes = [...standardVotes, ...customVotes];
  votes.sort((a, b) => a.position - b.position);
  if (participationList && participationList.present.length > 0) {
    // only try fetching voters if people were present
    await Promise.all(
      votes.map((vote) =>
        vote.type === 'customVote' ? vote : vote.fetchVoters(participantCache)
      )
    );
  }
  let content;
  if (isPublic) {
    const document = await editorDocumentFromUuid(
      treatment.editorDocumentUuid,
      treatment.attachments,
      previewType
    );
    content = document?.content ?? '';
  } else {
    const decisions = await Decision.extractDecisionsFromDocument(
      treatment.editorDocumentUuid
    );
    const template = PUBLISHER_TEMPLATES.get(
      'decisionsTitleAndDescriptionOnly'
    );
    content = template({ decisions });
  }
  return {
    treatment,
    agendapoint,
    meeting,
    prefixes: prefixes.join(' '),
    participationList,
    votes,
    content,
    articleNumber: Number(treatment.position) + 1,
  };
}

export function constructHtmlForExtract(extractData) {
  const template = PUBLISHER_TEMPLATES.get('extract');
  const html = template(extractData);
  return html;
}

export async function signVersionedExtract(
  uri,
  sessionId,
  targetStatus,
  attachments
) {
  return await handleVersionedResource(
    'signature',
    uri,
    sessionId,
    targetStatus,
    'ext:signsBehandeling',
    undefined,
    undefined,
    attachments
  );
}

export async function publishVersionedExtract(
  extractUri,
  sessionId,
  targetStatus,
  attachments
) {
  await handleVersionedResource(
    'publication',
    extractUri,
    sessionId,
    targetStatus,
    'ext:publishesBehandeling',
    undefined,
    undefined,
    attachments
  );
  await updateStatusOfLinkedContainer(extractUri);
}

export async function ensureVersionedExtract(treatment, meeting) {
  const versionedExtract = await VersionedExtract.query({
    treatmentUuid: treatment.uuid,
  });
  if (versionedExtract) {
    console.log(
      `reusing versioned extract for treatment with uuid  ${treatment.uuid}`
    );
    return versionedExtract.uri;
  } else {
    const data = await buildExtractDataForTreatment(
      treatment,
      meeting,
      IS_FINAL,
      true
    );
    const html = constructHtmlForExtract(data);
    const extract = await VersionedExtract.create({ meeting, treatment, html });
    return extract.uri;
  }
}

async function updateStatusOfLinkedContainer(extractUri) {
  const documentContainerQuery = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    SELECT ?documentContainer WHERE  {
      ${sparqlEscapeUri(extractUri)} a ext:VersionedBehandeling;
        ext:behandeling ?behandeling.
      ?behandeling ext:hasDocumentContainer ?documentContainer.
    }
  `);
  if (!documentContainerQuery.results.bindings.length)
    throw new Error(
      'Document container not found for versioned behandeling ' + extractUri
    );
  const documentContainerUri =
    documentContainerQuery.results.bindings[0].documentContainer.value;
  await update(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ?status
    } INSERT {
      ${sparqlEscapeUri(
        documentContainerUri
      )} ext:editorDocumentStatus ${sparqlEscapeUri(DOCUMENT_PUBLISHED_STATUS)}
    } WHERE {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ?status
    }
  `);
}

/**
 * Checks if a behandeling has already been published or not.
 * Returns true if published, false if not.
 */
export async function isPublished(behandelingUri) {
  const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      SELECT ?versionedBehandeling
      WHERE
      {
        ?versionedBehandeling a ext:VersionedBehandeling;
                  ext:behandeling ${sparqlEscapeUri(behandelingUri)}.
        FILTER EXISTS { ?publishedResource ext:publishesBehandeling ?versionedBehandeling }.
      } LIMIT 1
  `);
  return r.results.bindings.length > 0;
}
