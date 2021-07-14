import Treatment from '../models/treatment';
import AgendaPoint from '../models/agendapoint';
import Meeting from '../models/meeting';
import Vote from '../models/vote';
import Decision from '../models/decision';
import { query, update, sparqlEscapeUri} from 'mu';
import {prefixes} from "./prefixes";
import {fetchParticipationListForTreatment} from './query-utils';
import { editorDocumentFromUuid } from './editor-document';
import { PUBLISHER_TEMPLATES} from './setup-handlebars';
import validateMeeting from './validate-meeting';
import validateTreatment from './validate-treatment';
import VersionedExtract from '../models/versioned-behandeling';
import {handleVersionedResource} from './pre-importer';

const DOCUMENT_PUBLISHED_STATUS = 'http://mu.semte.ch/application/concepts/ef8e4e331c31430bbdefcdb2bdfbcc06';
/**
 * This file contains helpers for exporting, signing and publishing an extract of the meeting notes
 * an extract is the treatment of one agendapoint and all it's related info
 */


// here for legacy purposes
export async function buildAllExtractsForMeeting(meetingUuid) {
  const treatments = await Treatment.findAll({meetingUuid});
  const extracts = [];
  const meeting = await Meeting.find(meetingUuid);
  const meetingErrors = validateMeeting(meeting);
  for (const treatment of treatments) {
    const data = await buildExtractDataForTreatment(treatment, meeting, true);
    const html = constructHtmlForExtract(data);
    const treatmentErrors = await validateTreatment(treatment);
    extracts.push( {
      data: {
        attributes: {
          content: html,
          errors: [...meetingErrors, ...treatmentErrors],
          behandeling: treatment.uri,
          uuid: treatment.uuid
        }
      }
    });
  }
  return extracts;
}

export async function buildExtractData(treatmentUuid, isPublic = true) {
  const treatment = await Treatment.find(treatmentUuid);
  const meeting = await Meeting.findURI(treatment.meeting);
  return await buildExtractDataForTreatment(treatment, meeting, isPublic);

}

export async function buildExtractDataForTreatment(treatment, meeting, isPublic = true) {
  const agendapoint = await AgendaPoint.findURI(treatment.agendapoint);
  const participationList = await fetchParticipationListForTreatment(treatment.uri);

  const votes = await Vote.findAll({treatmentUri: treatment.uri});
  await Promise.all(votes.map((vote) => vote.fetchVoters()));
  let content;
  if (isPublic) {
    const document = await editorDocumentFromUuid(treatment.editorDocumentUuid, treatment.attachments);
    content = document?.content ?? "";
  }
  else {
    const decisions = await Decision.extractDecisionsFromDocument(treatment.editorDocumentUuid);
    const template =  PUBLISHER_TEMPLATES.get('decisionsTitleAndDescriptionOnly');
    content = template({decisions});
  }
  return {treatment, agendapoint, meeting, prefixes: prefixes.join(" "), participationList, votes, content};
}

export function constructHtmlForExtract(extractData) {
  const template = PUBLISHER_TEMPLATES.get('extract');
  const html = template(extractData);
  return html;
}

export async function signVersionedExtract( uri, sessionId, targetStatus, attachments ) {
  await handleVersionedResource( "signature", uri, sessionId, targetStatus, 'ext:signsBehandeling', undefined, undefined, attachments);
}

export async function publishVersionedExtract( extractUri, sessionId, targetStatus, attachments ) {
  await handleVersionedResource( "publication", extractUri, sessionId, targetStatus, 'ext:publishesBehandeling', undefined, undefined, attachments);
  await updateStatusOfLinkedContainer(extractUri);
}

export async function ensureVersionedExtract(treatment, meeting) {
  const versionedExtract = await VersionedExtract.query({treatmentUuid: treatment.uuid});
  if (versionedExtract) {
    console.log(`reusing versioned extract for treatment with uuid  ${treatment.uuid}`);
    return versionedExtract.uri;
  }
  else {
    const data = await buildExtractDataForTreatment(treatment, meeting, true);
    const html = constructHtmlForExtract(data);
    const extract = await VersionedExtract.create({meeting, treatment, html});
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
  if(!documentContainerQuery.results.bindings.length)
    throw new Error('Document container not found for versioned behandeling ' + extractUri);
  const documentContainerUri = documentContainerQuery.results.bindings[0].documentContainer.value;
  await update(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ?status
    } INSERT {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ${sparqlEscapeUri(DOCUMENT_PUBLISHED_STATUS)}
    } WHERE {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ?status
    }
  `);
}

/**
 * Checks if a behandeling has already been published or not.
 * Returns true if published, false if not.
 */
export async function isPublished( behandelingUri ) {
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
