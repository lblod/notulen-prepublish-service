// @ts-ignore
import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import {handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';
import { PUBLISHER_TEMPLATES } from './setup-handlebars';
import { prefixes } from './prefixes';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import Decision from '../models/decision';
import Vote from '../models/vote';

async function buildBesluitenLijstForZitting(meetingUuid) {
  const meeting = await Meeting.find(meetingUuid);
  const treatments = await Treatment.findAll({meetingUuid});
  for (const treatment of treatments) {
    await addVotesToTreatment(treatment);
    await addDecisionsToTreatment(treatment);
  }
  const html = constructHtmlForDecisionList(meeting, treatments);
  const errors = meeting.validate();
  return {html, errors};
}

async function addDecisionsToTreatment(treatment) {
  treatment.decisions = await Decision.fromDoc(treatment.editorDocumentUuid);
}

async function addVotesToTreatment(treatment) {
  const votes = await Vote.findAll({ treatment: treatment.uri});
  if (votes.length > 0) {
    // this makes it easier to check if there are votes in the template
    treatment.votes = votes;
  }
}

export function constructHtmlForDecisionList(meeting, treatments) {
  const template = PUBLISHER_TEMPLATES.get('decisionList');
  const html = template({meeting, treatments, prefixes: prefixes.join(" ")});
  return html;
}

async function ensureVersionedBesluitenLijstForZitting( zitting ) {
  // TODO remove (or move) relationship between previously signable
  // besluitenLijst, and the current besluitenLijst.

  const previousId = await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>

    SELECT ?besluitenLijstUri
    WHERE {
      ?besluitenLijstUri
        a ext:VersionedBesluitenLijst.
      ${sparqlEscapeUri(zitting.uri)} besluit:heeftBesluitenlijst ?besluitenLijstUri
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedBesluitenLijstId = previousId.results.bindings[0].besluitenLijstUri.value;
    console.log(`Reusing versioned besluitenlijst ${versionedBesluitenLijstId}`);
    return versionedBesluitenLijstId;
  } else {
    console.log(`Creating a new versioned besluitenlijst for ${zitting.uri}`);
    const {html, errors} = await buildBesluitenLijstForZitting( zitting );
    if(errors.length) {
      throw new Error(errors.join(', '));
    }
    const besluitenLijstUuid = uuid();
    const besluitenLijstUri = `http://data.lblod.info/besluiten-lijsten/${besluitenLijstUuid}`;

    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>

      INSERT DATA{
        ${sparqlEscapeUri(besluitenLijstUri)}
          a ext:VersionedBesluitenLijst;
          ext:content ${hackedSparqlEscapeString( html )};
          mu:uuid ${sparqlEscapeString( besluitenLijstUuid )}.
        ${sparqlEscapeUri(zitting.uri)} besluit:heeftBesluitenlijst ${sparqlEscapeUri(besluitenLijstUri)}.
      }`);

    return besluitenLijstUri;
  }
}

async function signVersionedBesluitenlijst( versionedBesluitenLijstUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedBesluitenLijstUri, sessionId, targetStatus, 'ext:signsBesluitenlijst');
}

async function publishVersionedBesluitenlijst( versionedBesluitenLijstUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedBesluitenLijstUri, sessionId, targetStatus, 'ext:publishesBesluitenlijst');
}


export {signVersionedBesluitenlijst, publishVersionedBesluitenlijst, ensureVersionedBesluitenLijstForZitting, buildBesluitenLijstForZitting };
