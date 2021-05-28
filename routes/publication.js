import express from 'express';
import {getZittingForAgenda} from "../support/agenda-queries";
import {getZittingForBesluitenlijst} from '../support/besluit-queries';
import {getZittingForBehandeling} from '../support/behandeling-queries';
import {getZittingForNotulen} from '../support/notulen-queries';
import {ensureVersionedAgendaForZitting, publishVersionedAgenda} from '../support/agenda-exporter';
import {ensureVersionedBesluitenLijstForZitting, publishVersionedBesluitenlijst} from '../support/besluit-exporter';
import {ensureVersionedBehandelingForZitting, publishVersionedBehandeling} from '../support/behandeling-exporter';
import {ensureVersionedNotulenForZitting, publishVersionedNotulen} from '../support/notule-exporter';
import {isPublished} from '../support/behandeling-exporter';


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
router.post('/signing/agenda/publish/:kind/:zittingIdentifier', async function(req, res, next) {
  // TODO this is 99% the same as
  // /signing/agenda/sign/:kind/:documentIdentifier, it just uses the
  // publishVersionedAgenda instead.  We can likely clean this up.

  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting = await getZittingForAgenda(req.params.zittingIdentifier);
    const prepublishedAgendaUri = await ensureVersionedAgendaForZitting(
      zitting,
      req.params.kind
    );
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
        req.params.zittingIdentifier
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

  try {
    const zitting = await getZittingForBesluitenlijst(req.params.zittingIdentifier);
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(zitting);
    await publishVersionedBesluitenlijst( prepublishedBesluitenlijstUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while published the besluitenlijst ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }
} );


/**
 * Makes the current user publish the provided behandeling for the supplied document.
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
router.post('/signing/behandeling/publish/:zittingIdentifier/:behandelingUuid', async function(req, res, next) {
  try {
    const zitting =  await getZittingForBehandeling(req.params.zittingIdentifier);
    const behandelingUuid = decodeURIComponent(req.params.behandelingUuid);
    const prepublishedBehandelingUri = await ensureVersionedBehandelingForZitting(zitting, behandelingUuid);
    await publishVersionedBehandeling( prepublishedBehandelingUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while publishing the behandeling ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }
});

/**
 * Makes the current user publish the notulen for the supplied document as well as the un-published uittreksels.
 * Ensures the prepublished notulen that are signed are persisted in the store and attached to the document container
 */
router.post('/signing/notulen/publish/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForNotulen( req.params.zittingIdentifier );
    const publicBehandelingUris = req.body['public-behandeling-uris'];
    const zittingForBehandeling =  await getZittingForBehandeling(req.params.zittingIdentifier);
    for(let agendapunt of zitting.agendapunten) {
      if(publicBehandelingUris && publicBehandelingUris.includes(agendapunt.behandeling.uri)) {
        const isBehandelingPublished = await isPublished(agendapunt.behandeling.uri);
        if(!isBehandelingPublished) {
          const prepublishedBehandelingUri = await ensureVersionedBehandelingForZitting(zittingForBehandeling, agendapunt.behandeling.uuid);
          await publishVersionedBehandeling( prepublishedBehandelingUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
        }
      }
    }
    const prepublishedNotulenUri = await ensureVersionedNotulenForZitting(zitting, 'publication', publicBehandelingUris);
    await publishVersionedNotulen( prepublishedNotulenUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while published the notulen ${req.params.zittingIdentifier}: ${err}`);
    return next(error);
  }
} );

export default router;
