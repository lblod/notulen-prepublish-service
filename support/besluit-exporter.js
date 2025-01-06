// @ts-nocheck
// @ts-strict-ignore

import { query, sparqlEscapeString, sparqlEscapeUri, update, uuid } from 'mu';
import {
  hackedSparqlEscapeString,
  handleVersionedResource,
} from './pre-importer';
import { PUBLISHER_TEMPLATES } from './setup-handlebars';
import { prefixes } from './prefixes';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import Decision from '../models/decision';
import StandardVote from '../models/standard-vote';
import CustomVote from '../models/custom-vote';

export async function buildBesluitenLijstForMeetingId(meetingUuid) {
  const meeting = await Meeting.find(meetingUuid);
  return buildBesluitenLijstForMeeting(meeting, meetingUuid);
}

async function buildBesluitenLijstForMeeting(meeting, meetingUuid) {
  const treatments = await Treatment.findAll({ meetingUuid });
  for (const treatment of treatments) {
    await addVotesToTreatment(treatment);
    await addDecisionsToTreatment(treatment);
  }
  const treatmentsWithDecisions = treatments.filter(
    (t) => t.decisions.length > 0
  );
  const html = constructHtmlForDecisionList(meeting, treatmentsWithDecisions);
  const errors = meeting.validate();
  if (!treatmentsWithDecisions.length) {
    return { html, errors: [...errors, 'Geen besluiten gevonden'] };
  }
  return { html, errors };
}

async function addDecisionsToTreatment(treatment) {
  treatment.decisions = await Decision.extractDecisionsFromDocument(
    treatment.editorDocumentUuid
  );
}

async function addVotesToTreatment(treatment) {
  const standardVotes = await StandardVote.findAll({
    treatmentUri: treatment.uri,
  });

  const customVotes = await CustomVote.findAll({ treatmentUri: treatment.uri });

  standardVotes.sort((a, b) => a.position - b.position);
  customVotes.sort((a, b) => a.position - b.position);
  treatment.standardVotes = standardVotes;
  treatment.customVotes = customVotes;
}

export function constructHtmlForDecisionList(meeting, treatments) {
  const template = PUBLISHER_TEMPLATES.get('decisionList');
  const html = template({ meeting, treatments, prefixes: prefixes.join(' ') });
  return html;
}

async function ensureVersionedBesluitenLijstForZitting(meetingUuid) {
  // TODO remove (or move) relationship between previously signable
  // besluitenLijst, and the current besluitenLijst.
  const meeting = await Meeting.find(meetingUuid);
  const previousId =
    await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>

    SELECT ?besluitenLijstUri
    WHERE {
      ?besluitenLijstUri
        a ext:VersionedBesluitenLijst.
      ${sparqlEscapeUri(
        meeting.uri
      )} besluit:heeftBesluitenlijst ?besluitenLijstUri.
      FILTER NOT EXISTS { ?besluitenLijstUri ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean> }
    } LIMIT 1`);

  if (previousId.results.bindings.length) {
    const versionedBesluitenLijstId =
      previousId.results.bindings[0].besluitenLijstUri.value;
    console.log(
      `Reusing versioned besluitenlijst ${versionedBesluitenLijstId}`
    );
    return versionedBesluitenLijstId;
  } else {
    console.log(`Creating a new versioned besluitenlijst for ${meeting.uri}`);
    const { html, errors } = await buildBesluitenLijstForMeeting(
      meeting,
      meetingUuid
    );
    if (errors.length) {
      throw new Error(errors.join(', '));
    }
    const besluitenLijstUuid = uuid();
    const besluitenLijstUri = `http://data.lblod.info/besluiten-lijsten/${besluitenLijstUuid}`;

    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>

      INSERT DATA{
        ${sparqlEscapeUri(besluitenLijstUri)}
          a ext:VersionedBesluitenLijst;
          ext:content ${hackedSparqlEscapeString(html)};
          mu:uuid ${sparqlEscapeString(besluitenLijstUuid)};
          ext:deleted "false"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>.
        ${sparqlEscapeUri(
          meeting.uri
        )} besluit:heeftBesluitenlijst ${sparqlEscapeUri(besluitenLijstUri)}.
      }`);

    return besluitenLijstUri;
  }
}

async function signVersionedBesluitenlijst(
  versionedBesluitenLijstUri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    'signature',
    versionedBesluitenLijstUri,
    sessionId,
    targetStatus,
    'ext:signsBesluitenlijst'
  );
}

async function publishVersionedBesluitenlijst(
  versionedBesluitenLijstUri,
  sessionId,
  targetStatus
) {
  await handleVersionedResource(
    'publication',
    versionedBesluitenLijstUri,
    sessionId,
    targetStatus,
    'ext:publishesBesluitenlijst'
  );
}

export {
  signVersionedBesluitenlijst,
  publishVersionedBesluitenlijst,
  ensureVersionedBesluitenLijstForZitting,
};
