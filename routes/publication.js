// @ts-ignore
import express from 'express';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
import {ensureVersionedAgendaForMeeting, publishVersionedAgenda} from '../support/agenda-utils';
import {ensureVersionedBesluitenLijstForZitting, publishVersionedBesluitenlijst} from '../support/besluit-exporter';
import {ensureVersionedExtract, publishVersionedExtract, isPublished} from '../support/extract-utils';
import {ensureVersionedNotulen, publishVersionedNotulen, NOTULEN_KIND_PUBLIC} from '../support/notulen-utils';
import { ensureTask } from '../support/task-utils';
import { 
  TASK_STATUS_FAILURE,
  TASK_STATUS_RUNNING,
  TASK_STATUS_SUCCESS,
  TASK_TYPE_PUBLISHING_DECISION_LIST,
  TASK_TYPE_PUBLISHING_MEETING_NOTES
} from '../models/task';


const router = express.Router();

/***
 *
 *  PUBLICATION ENDPOINTS
 *
 */

/**
 * Makes the current user publish the agenda for the supplied document.
 * Ensures the prepublished agenda that is signed is persisted in the store and attached to the document container
 */
router.post('/signing/agenda/publish/:agendaKindUuid/:meetingUuid', async function(req, res, next) {
  try {
    const prepublishedAgendaUri = await ensureVersionedAgendaForMeeting(req.params.meetingUuid, req.params.agendaKindUuid);
    await publishVersionedAgenda(
      prepublishedAgendaUri,
      req.header("MU-SESSION-ID"),
      "gepubliceerd"
    );
    return res.send({success: true}).end();
  } catch (err) {
    console.log(err);
    const error = new Error(
      `An error occurred while publishing the agenda ${
        req.params.meetingUuid
      }: ${err}`
    );
    return next(error);
  }
} );

/**
 * Makes the current user publish the besluitenlijst for the supplied document.
 * Ensures the prepublished besluitenlijst that is signed is persisted in the store and attached to the document container
 */
router.post('/signing/besluitenlijst/publish/:zittingIdentifier', async function(req, res, next) {
  // TODO this is 99% the same as
  // /signing/besluitenlijst/sign/:kind/:documentIdentifier, it just uses the
  // publishVersionedBesluitenlijst instead.  We can likely clean this up.
  let publishingTask;
  try {
    const meetingUuid = req.params.zittingIdentifier;
    const meeting = await Meeting.find(meetingUuid);
    publishingTask = await ensureTask(meeting, TASK_TYPE_PUBLISHING_DECISION_LIST);
    res.json({ data: { id: publishingTask.id, status: "accepted" , type: publishingTask.type}});
  }
  catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while publishing the besluitenlijst ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }
  try {
    await publishingTask.updateStatus(TASK_STATUS_RUNNING);
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(req.params.zittingIdentifier);
    await publishVersionedBesluitenlijst( prepublishedBesluitenlijstUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    await publishingTask.updateStatus(TASK_STATUS_SUCCESS);
  }
  catch (err) {
    publishingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
  }
} );


/**
 * Makes the current user publish the provided behandeling for the supplied document.
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
router.post('/signing/behandeling/publish/:zittingIdentifier/:behandelingUuid', async function(req, res, next) {
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
      await publishVersionedExtract( extractUri, req.header("MU-SESSION-ID"), "gepubliceerd", treatment.attachments );
      return res.send( { success: true } ).end();
    }
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while publishing the behandeling ${req.params.behandelingUuid}: ${err}`);
    return next(error);
  }
});

/**
 * Makes the current user publish the notulen for the supplied document as well as the un-published uittreksels.
 * Ensures the prepublished notulen that are signed are persisted in the store and attached to the document container
 */
router.post('/signing/notulen/publish/:zittingIdentifier', async function(req, res, next) {
  let publishingTask;
  let meetingUuid;
  let meeting;
  try {
    meetingUuid = req.params.zittingIdentifier;
    meeting = await Meeting.find(meetingUuid);
    publishingTask = await ensureTask(meeting, TASK_TYPE_PUBLISHING_MEETING_NOTES);

    res.json({ data: { id: publishingTask.id, status: "accepted" , type: publishingTask.type}});
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while publishing the notulen ${req.params.zittingIdentifier}:${err}`);
    return next(error);
  }
  try {
    await publishingTask.updateStatus(TASK_STATUS_RUNNING);
    const treatments = await Treatment.findAll({meetingUuid});
    let errors = validateMeeting(meeting);
    const attachments = [];
    for (const treatment of treatments) {
      const treatmentErrors = await validateTreatment(treatment);
      errors = [...errors, ...treatmentErrors];
      if(treatment.attachments) {
        attachments.push(...treatment.attachments);
      }
    }
    if (errors.length) {
      throw new Error(errors.join(","));
    }
    else {
      const publicBehandelingUris = req.body['public-behandeling-uris'];
      const versionedNotulenUri = await ensureVersionedNotulen(meeting, treatments, NOTULEN_KIND_PUBLIC, publicBehandelingUris);
      await publishVersionedNotulen( versionedNotulenUri, req.header("MU-SESSION-ID"), "gepubliceerd", attachments);
      for (const treatment of treatments) {
        if (publicBehandelingUris.includes(treatment.uri)) {
          const published = await isPublished(treatment.uri);
          if (! published) {
            const extractUri = await ensureVersionedExtract(treatment, meeting);
            await publishVersionedExtract( extractUri, req.header("MU-SESSION-ID"), "gepubliceerd", treatment.attachments );
          }
        }
      }
    }
    await publishingTask.updateStatus(TASK_STATUS_SUCCESS);
  } catch (err) {
    await publishingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
  }
} );

export default router;
