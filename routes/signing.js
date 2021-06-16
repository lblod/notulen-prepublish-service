import express from 'express';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
import {getZittingForNotulen} from '../support/notulen-queries';
import {ensureVersionedAgendaForMeeting, signVersionedAgenda} from '../support/agenda-utils';
import {ensureVersionedBesluitenLijstForZitting, signVersionedBesluitenlijst} from '../support/besluit-exporter';
import {ensureVersionedNotulenForZitting, signVersionedNotulen} from '../support/notule-exporter';
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
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const prepublishedAgendaUri = await ensureVersionedAgendaForMeeting(req.params.meetingUuid, req.params.agendaKindUuid);
    await signVersionedAgenda(
      prepublishedAgendaUri,
      req.header("MU-SESSION-ID"),
      "eerste handtekening"
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
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(req.params.zittingIdentifier);
    await signVersionedBesluitenlijst( prepublishedBesluitenlijstUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
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
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
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
      await signVersionedExtract( extractUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
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
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting = await getZittingForNotulen( req.params.zittingIdentifier );
    const prepublishedNotulenUri = await ensureVersionedNotulenForZitting(zitting, 'publication');
    await signVersionedNotulen( prepublishedNotulenUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the notulen ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }
});

export default router;
