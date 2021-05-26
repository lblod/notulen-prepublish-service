import express from 'express';
import {getZittingForAgenda} from "../support/agenda-queries";
import {getZittingForBesluitenlijst} from '../support/besluit-queries';
import {getZittingForBehandeling} from '../support/behandeling-queries';
import {getZittingForNotulen} from '../support/notulen-queries';
import {ensureVersionedAgendaForZitting, signVersionedAgenda} from '../support/agenda-exporter';
import {ensureVersionedBesluitenLijstForZitting, signVersionedBesluitenlijst} from '../support/besluit-exporter';
import {ensureVersionedBehandelingForZitting, signVersionedBehandeling} from '../support/behandeling-exporter';
import {ensureVersionedNotulenForZitting, signVersionedNotulen} from '../support/notule-exporter';

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
router.post("/signing/agenda/sign/:kind/:zittingIdentifier", async function (req, res, next) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting = await getZittingForAgenda(req.params.zittingIdentifier);
    const prepublishedAgendaUri = await ensureVersionedAgendaForZitting(
      zitting,
      req.params.kind
    );
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
    const zitting = await getZittingForBesluitenlijst(req.params.zittingIdentifier);
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(zitting);
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
    const zitting =  await getZittingForBehandeling(req.params.zittingIdentifier);
    const behandelingUuid = decodeURIComponent(req.params.behandelingUuid);
    const prepublishedBehandelingUri = await ensureVersionedBehandelingForZitting(zitting, behandelingUuid);
    console.log(prepublishedBehandelingUri);
    await signVersionedBehandeling( prepublishedBehandelingUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
    return res.send( { success: true } ).end();
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
