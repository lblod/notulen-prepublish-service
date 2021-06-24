// @ts-ignore
import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import { PUBLISHER_TEMPLATES } from './setup-handlebars';
import { ensureAgendapointType } from './agenda-utils';
import { handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';
import { createBehandelingExtract } from './behandeling-exporter';
import { buildExtractDataForTreatment} from './extract-utils';
import { prefixes } from "./prefixes";
import { fetchIntermissions } from './notulen-queries';
import Meeting from '../models/meeting';
import AgendaPoint from '../models/agendapoint';
import Concept from '../models/concept';
import Treatment from '../models/treatment';
import validateMeeting from "./validate-meeting";
import validateTreatment from "./validate-treatment";

import * as path from "path";
import * as fs from "fs";
import Handlebars from "handlebars";
import { fetchParticipationList } from './query-utils';
const DRAFT_DECISON_PUBLISHED_STATUS = 'http://mu.semte.ch/application/concepts/ef8e4e331c31430bbdefcdb2bdfbcc06';
const PLANNED_AGENDAPOINT_TYPE_ID = "bdf68a65-ce15-42c8-ae1b-19eeb39e20d0";

/**
 * This file contains helpers for exporting, signing and publishing content from the notule.
 */



export async function constructHtmlForMeetingNotes(meetingUuid) {
  const meeting = await Meeting.find(meetingUuid);
  const agendapoints = await AgendaPoint.findAll({meetingUuid});
  const defaultAgendaPointType = await Concept.find(PLANNED_AGENDAPOINT_TYPE_ID);
  ensureAgendapointType(agendapoints, defaultAgendaPointType);
  const treatments = await Treatment.findAll({meetingUuid});
  const treatmentsData = [];
  let errors = validateMeeting(meeting);
  for (const treatment of treatments) {
    const data = await buildExtractDataForTreatment(treatment, meeting, true);
    treatmentsData.push(data);
    const treatmentErrors = await validateTreatment(treatment);
    errors = [...errors, ...treatmentErrors];
  }
  const participationList = await fetchParticipationList(meeting.uri);
  const intermissions = await fetchIntermissions(meeting.uri);
  const html = constructHtmlForMeetingNotesFromData({meeting, agendapoints, treatmentsData, intermissions, participationList});
  return {errors, html};
}

function constructHtmlForMeetingNotesFromData({meeting, agendapoints, treatmentsData, intermissions, participationList}) {
  const template = PUBLISHER_TEMPLATES.get("meetingNotes");
  const html = template({meeting, agendapoints, treatmentsData, intermissions, participationList, prefixes});
  return html;
}

/**
 * Extracts the Notulen content from the supplied zitting
 * Returns an HTML+RDFa snippet containing the zitting content
 * If a list of publicBehandelingUris is passed, the snippet will contain only those behandelingen.
 * If publicBehandelingUris is null, the snippet will contain all behandelingen.
 */
async function extractNotulenContentFromZitting(meetingUuid, publicBehandelingUris) {
  const meeting = await Meeting.find(meetingUuid);
  let {behandelingsHtml, behandelingsErrors} = await generateBehandelingsHtml(zitting, publicBehandelingUris);
  const notulenData = Object.assign(zitting, {behandelingsHtml, prefixes: prefixes.join(' ')});
  const html = generateNotulenHtml(notulenData);
  const errors = validateMeeting( {
    plannedStart: zitting.geplandeStart && zitting.geplandeStart.value,
    startedAt: zitting.startedAt && zitting.startedAt.value,
    endedAt: zitting.endedAt && zitting.endedAt.value
  });
  errors.push(...behandelingsErrors);
  return {html, errors};
}

function generateNotulenHtml(notulenData) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/notulen-prepublish.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  return template(notulenData);
}

async function generateBehandelingsHtml(zitting, publicBehandelingUris) {
  let behandelingsHtml = '';
  const behandelingsErrors = [];
  for(const agendapunt of zitting.agendapunten) {
    const isPublic = !publicBehandelingUris || publicBehandelingUris.includes(agendapunt.behandeling.uri);
    const {html, errors} = await createBehandelingExtract(zitting, agendapunt, false, isPublic);
    behandelingsHtml += html;
    behandelingsErrors.push(...errors);
  }
  return {behandelingsHtml, behandelingsErrors};
}

async function signVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedNotulenUri, sessionId, targetStatus, 'ext:signsNotulen');
}

async function publishVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedNotulenUri, sessionId, targetStatus, 'ext:publishesNotulen');
  await updateDraftDecisionStatus( versionedNotulenUri );
}

async function updateDraftDecisionStatus( versionedNotulenUri ) {
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

/**
 * Creates a versioned notulen item in the triplestore which could be signed.
 * The versioned notulen are attached to the document container.
 * The content of the versioned notulen always contains the full Zitting from the document
 * Additionally, on publication the versioned notulen also gets a public-content property containing
 * only the behandelingen that are public.
 */
async function ensureVersionedNotulenForZitting(zitting, type, publicBehandelingUris) {
  // TODO remove (or move) relationship between previously signable notulen, and the current notulen.
  const previousId = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX sign: <http://mu.semte.ch/vocabularies/ext/signing/>

    SELECT ?notulenUri
    WHERE {
      ?notulenUri a ext:VersionedNotulen;
                  ext:notulenKind ${sparqlEscapeString(type)}.
      ${sparqlEscapeUri(zitting.zittingUri)} ext:hasVersionedNotulen  ?notulenUri.
    } LIMIT 1`);
  if( previousId.results.bindings.length ) {
    const versionedNotulenId = previousId.results.bindings[0].notulenUri.value;
    console.log(`Reusing versioned notulen ${versionedNotulenId}`);
    return versionedNotulenId;
  } else {
    console.log(`Creating a new versioned notulen for ${zitting.zittingUri}`);
    const {html, errors} = await extractNotulenContentFromZitting(zitting, publicBehandelingUris);
    if(errors.length){
      throw new Error(errors.join(', '));
    }
    const notulenUuid = uuid();
    const notulenUri = `http://data.lblod.info/prepublished-notulen/${notulenUuid}`;

    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA{
        ${sparqlEscapeUri(notulenUri)}
          a ext:VersionedNotulen;
          ext:content ${hackedSparqlEscapeString(html)};
          ext:notulenKind ${sparqlEscapeString(type)};
          mu:uuid ${sparqlEscapeString( notulenUuid )}.
        ${sparqlEscapeUri(zitting.zittingUri)} ext:hasVersionedNotulen ${sparqlEscapeUri(notulenUri)}.
        ${zitting.agendapunten.map((ap) => `${sparqlEscapeUri(ap.uri)} <http://data.vlaanderen.be/ns/besluit#Agendapunt.type> ${sparqlEscapeUri(ap.type)}.`).join("\n")}
      }`);
    return notulenUri;
  }
}

/**
 * Sets the public-content of a versioned notulen containing only the public behandeling of the Zitting
*/
async function addPublicContentOnVersionedNotulen(zitting, notulenUri, publicBehandelingUris) {
  console.log(`Enriching versioned notulen ${notulenUri} with public content only publishing behandelingen ${JSON.stringify(publicBehandelingUris)}`);

  let publicBehandelingUrisStatement = '';
  if (publicBehandelingUris && publicBehandelingUris.length) {
    const uris = publicBehandelingUris.map(uri => sparqlEscapeUri(uri)).join(', ');
    publicBehandelingUrisStatement = `${sparqlEscapeUri(notulenUri)} ext:publicBehandeling ${uris} .`;
  }

  const {html, errors} = await extractNotulenContentFromZitting( zitting, publicBehandelingUris);
  if(errors.length) {
    throw new Error(errors.join(', '));
  }
  await update(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

    DELETE {
      ${sparqlEscapeUri(notulenUri)} ext:publicContent ?publicContent ;
                                     ext:publicBehandeling ?publicBehandeling .
    } WHERE {
      ${sparqlEscapeUri(notulenUri)} a ext:VersionedNotulen.
      OPTIONAL { ${sparqlEscapeUri(notulenUri)} ext:publicBehandeling ?publicBehandeling . }
    }

    ;

    INSERT DATA {
      ${sparqlEscapeUri(notulenUri)} ext:publicContent ${hackedSparqlEscapeString(html)} .
      ${publicBehandelingUrisStatement}
    }
  `);
}


export { ensureVersionedNotulenForZitting, extractNotulenContentFromZitting, signVersionedNotulen, publishVersionedNotulen };
