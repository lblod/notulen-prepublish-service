import express from 'express';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
import {ensureVersionedAgendaForMeeting, signVersionedAgenda} from '../support/agenda-utils';
import {ensureVersionedBesluitenLijstForZitting, signVersionedBesluitenlijst} from '../support/besluit-exporter';
import {ensureVersionedNotulen, NOTULEN_KIND_FULL, signVersionedNotulen} from '../support/notulen-utils';
import {ensureVersionedExtract, signVersionedExtract} from '../support/extract-utils';
import { performance } from 'perf_hooks';
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

/**
 * Makes the current user sign the besluitenlijst for the supplied document.
 * Ensures the prepublished besluitenlijst that is signed is persisted in the store and attached to the document container
 */
router.post('/signing/besluitenlijst/sign/:zittingIdentifier', async function(req, res, next) {
  try {
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(req.params.zittingIdentifier);
    await signVersionedBesluitenlijst( prepublishedBesluitenlijstUri, req.header("MU-SESSION-ID"), "getekend" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the besluitenlijst ${req.params.documentIdentifier}: ${err}`);
    return next(error);
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
