import express from 'express';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import Task from '../models/task';
import { TASK_STATUS_FAILURE,
         TASK_STATUS_RUNNING,
         TASK_STATUS_SUCCESS,
         TASK_TYPE_SIGNING_DECISION_LIST
       } from '../models/task';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
import {ensureVersionedAgendaForMeeting, signVersionedAgenda} from '../support/agenda-utils';
import {ensureVersionedBesluitenLijstForZitting, signVersionedBesluitenlijst} from '../support/besluit-exporter';
import {ensureVersionedNotulen, NOTULEN_KIND_FULL, signVersionedNotulen} from '../support/notulen-utils';
import {ensureVersionedExtract, signVersionedExtract} from '../support/extract-utils';
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
        req.params.documentIdentifier
      }: ${err}`
    );
    return next(error);
  }
});

router.get('signing-tasks/:id', async function (req, res, next) {
  const taskUuid = req.params.id;
  const task = await Task.find(taskUuid);
  if (task) {
    res.status(200).send({
      data: {
        id: task.id,
        status: task.status,
        type: "signing-task",
        taskType: task.type,
      }
    });
  }
  else {
    res.status(404).send(`task with id ${taskUuid} was not found`);
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
    signingTask = await Task.query({meetingUri: meeting.uri, type: TASK_TYPE_SIGNING_DECISION_LIST});
    if (!signingTask) {
      signingTask = await Task.create(meeting, TASK_TYPE_SIGNING_DECISION_LIST);
    }
    return res.send({ data: { id: signingTask.id, status: "accepted" , type:"signing-task"}});
  }
  catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the besluitenlijst ${req.params.documentIdentifier}: ${err}`);
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
      const extractUri = await ensureVersionedExtract(treatment, meeting);
      await signVersionedExtract( extractUri, req.header("MU-SESSION-ID"), "getekend", treatment.attachments );
      return res.send( { success: true } ).end();
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
  try {
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
    if (errors.length) {
      return res.status(400).send({errors}).end();
    }
    else {
      const versionedNotulenUri = await ensureVersionedNotulen(meeting, treatments, NOTULEN_KIND_FULL);
      await signVersionedNotulen( versionedNotulenUri, req.header("MU-SESSION-ID"), "getekend", attachments);
      return res.send( { success: true } ).end();
    }
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the notulen ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }
});

export default router;
