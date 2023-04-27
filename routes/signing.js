import express from 'express';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import SignedResource from '../models/signed-resource';
import { ensureTask } from '../support/task-utils';
import {
  TASK_STATUS_FAILURE,
  TASK_STATUS_RUNNING,
  TASK_STATUS_SUCCESS,
  TASK_TYPE_SIGNING_DECISION_LIST,
  TASK_TYPE_SIGNING_MEETING_NOTES} from '../models/task';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
import {ensureVersionedAgendaForMeeting, signVersionedAgenda} from '../support/agenda-utils';
import {ensureVersionedBesluitenLijstForZitting, signVersionedBesluitenlijst} from '../support/besluit-exporter';
import {ensureVersionedNotulen, NOTULEN_KIND_FULL, signVersionedNotulen} from '../support/notulen-utils';
import {ensureVersionedExtract, signVersionedExtract} from '../support/extract-utils';
import {fetchCurrentUser} from '../support/query-utils';
import { getCurrentVersion, getLinkedDocuments } from '../support/editor-document-utils';
import { ensureVersionedRegulatoryStatement, signVersionedRegulatoryStatement } from '../support/regulatory-statement-utils';
import { getUri } from '../support/resource-utils';

import { parseBody } from '../support/parse-body';

const router = express.Router();


/**
 *
 *  SIGNING ENDPOINTS
 *
 */

/**
 * Makes the current user sign the agenda for the supplied document.
 * Ensures the prepublished agenda that is signed is persisted in the store and attached to the document container
 */
router.post("/signing/agenda/sign/:agendaKindUuid/:meetingUuid", async function (req, res, next) {
  try {
    const prepublishedAgendaUri = await ensureVersionedAgendaForMeeting(req.params.meetingUuid, req.params.agendaKindUuid);
    await signVersionedAgenda(
      prepublishedAgendaUri,
      req.header("MU-SESSION-ID"),
      "getekend"
    );
    return res.send({success: true}).end();
  } catch (err) {
    console.log(err);
    const error = new Error(
      `An error occurred while signing the agenda ${
        req.params.meetingUuid
      }: ${err}`
    );
    return next(error);
  }
});



/**
 * Makes the current user sign the besluitenlijst for the supplied document.
 * Ensures the prepublished besluitenlijst that is signed is persisted in the store and attached to the document container
 */
router.post('/signing/besluitenlijst/sign/:zittingIdentifier', async function(req, res, next) {
  let signingTask;
  try {
    const meetingUuid = req.params.zittingIdentifier;
    const meeting = await Meeting.find(meetingUuid);
    const userUri = await fetchCurrentUser(req.header("MU-SESSION-ID"));
    signingTask = await ensureTask(meeting, TASK_TYPE_SIGNING_DECISION_LIST, userUri);

    res.json({ data: { id: signingTask.id, status: "accepted" , type: signingTask.type}});
  }
  catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the besluitenlijst ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }
  try {
    await signingTask.updateStatus(TASK_STATUS_RUNNING);
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(req.params.zittingIdentifier);
    await signVersionedBesluitenlijst( prepublishedBesluitenlijstUri, req.header("MU-SESSION-ID"), "getekend" );
    await signingTask.updateStatus(TASK_STATUS_SUCCESS);
  }
  catch (err) {
    signingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
  }
});


/**
 * Makes the current user sign the provided behandeling for the supplied document.
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
router.post('/signing/behandeling/sign/:zittingIdentifier/:behandelingUuid', async function(req, res, next) {
  try {
    const meeting = await Meeting.find(req.params.zittingIdentifier);
    const treatment = await Treatment.find(req.params.behandelingUuid);
    const meetingErrors = validateMeeting(meeting);
    const treatmentErrors = await validateTreatment(treatment);
    const errors = [...meetingErrors, ...treatmentErrors];
    if (errors.length) {
      return res.status(400).send({errors}).end();
    }
    else {
      const { uri: extractUri } = await ensureVersionedExtract(treatment, meeting);
      await signVersionedExtract( extractUri, req.header("MU-SESSION-ID"), "getekend", treatment.attachments );
      const treatmentEditorDocumentUri = await getUri(treatment.editorDocumentUuid);
      const linkedRegulatoryStatementContainers = await getLinkedDocuments(treatmentEditorDocumentUri);
      const linkedRegulatoryStatementDocuments = await Promise.all(linkedRegulatoryStatementContainers.map(async (containerURI) => getCurrentVersion(containerURI)));
      const versionedRegulatoryStatements = await Promise.all(linkedRegulatoryStatementDocuments.map(async (doc) => ensureVersionedRegulatoryStatement(doc, extractUri)));
      await Promise.all(versionedRegulatoryStatements.map(async (versionedStatementUri) => signVersionedRegulatoryStatement(versionedStatementUri, req.header("MU-SESSION-ID"), "getekend")));
      return res.send( { success: true } ).end();
    }
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the behandeling ${req.params.behandelingUuid}: ${err}`);
    return next(error);
  }
});

/**
 * Creates a signed resource for the provided resource (currently only a treatment is supported)
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
router.post('/signed-resources', async function(req, res, next) {
  try {
    const {relationships} = parseBody(req.body);
    const treatmentUuid = relationships?.treatment?.id;
    if (treatmentUuid) {
      const treatment = await Treatment.find(treatmentUuid);
      const meeting = await Meeting.findURI(treatment.meeting);
      const meetingErrors = validateMeeting(meeting);
      const treatmentErrors = await validateTreatment(treatment);
      const errors = [...meetingErrors, ...treatmentErrors];
      if (errors.length) {
        return res.status(400).send({errors}).end();
      }
      else {
        const versionedExtract = await ensureVersionedExtract(treatment, meeting);
        const signedResourceUri = await signVersionedExtract( versionedExtract.uri, req.header("MU-SESSION-ID"), "getekend", treatment.attachments );
        const signedResource = await SignedResource.findURI(signedResourceUri);
        return  res.send({
          data: {
            "attributes": {
              "content": signedResource.html,
              "hash-value": signedResource.hashValue,
              "created-on": signedResource.created,
              "uri": signedResource.uri
            },
            "id": signedResource.uuid,
            "type": "signed-resources",
            "relationships": {
              "versioned-behandeling": {
                "data": { "type": "versioned-behandelingen", id: versionedExtract.uuid }
              },
              "gebruiker": {
                "data": { "type": "gebruikers", id: signedResource.signatoryUuid }
              }
            },
            "links": {
              "self": "/signed-resources/" + signedResource.uuid
            },
          }
        });
      }
    }
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the behandeling ${req.params.behandelingUuid}: ${err}`);
    return next(error);
  }
});

/**
 * Makes the current user sign the notulen for the supplied document.
 * Ensures the prepublished notulen that are signed are persisted in the store and attached to the document container
 */
router.post('/signing/notulen/sign/:zittingIdentifier', async function(req, res, next) {
  let signingTask;
  try {
    const meetingUuid = req.params.zittingIdentifier;
    const meeting = await Meeting.find(meetingUuid);
    const userUri = await fetchCurrentUser(req.header("MU-SESSION-ID"));
    signingTask = await ensureTask(meeting, TASK_TYPE_SIGNING_MEETING_NOTES, userUri);

    res.json({ data: { id: signingTask.id, status: "accepted" , type: signingTask.type}});
  } catch(err){
    console.log(err);
    await signingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
    const error = new Error(`An error occurred while signing the meeting notes ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }

  try {
    await signingTask.updateStatus(TASK_STATUS_RUNNING);
    const meetingUuid = req.params.zittingIdentifier;
    const meeting = await Meeting.find(meetingUuid);
    const treatments = await Treatment.findAll({meetingUuid});
    let errors = validateMeeting(meeting);
    const attachments = [];
    for (const treatment of treatments) {
      const treatmentErrors = await validateTreatment(treatment);
      errors = [...errors, ...treatmentErrors];
      attachments.push(...treatment.attachments);
    }
    if(errors.length) {
      throw new Error(errors.join(', '));
    }
    const versionedNotulenUri = await ensureVersionedNotulen(meeting, treatments, NOTULEN_KIND_FULL);
    await signVersionedNotulen( versionedNotulenUri, req.header("MU-SESSION-ID"), "getekend", attachments);

    await signingTask.updateStatus(TASK_STATUS_SUCCESS);
  } catch (err) {
    await signingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
  }
});

export default router;
