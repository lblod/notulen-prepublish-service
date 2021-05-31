import express from 'express';
import {getZittingForBesluitenlijst} from '../support/besluit-queries';
import {getZittingForBehandeling} from '../support/behandeling-queries';
import {getZittingForNotulen} from '../support/notulen-queries';
import {buildBesluitenLijstForZitting} from '../support/besluit-exporter';
import {extractBehandelingVanAgendapuntenFromZitting} from '../support/behandeling-exporter';
import {extractNotulenContentFromZitting} from '../support/notule-exporter';
import {constructHtmlForAgenda } from '../support/agenda-utils';
const router = express.Router();

/***
 *
 * PREPUBLICATION ENDPOINTS
 *
 */

/**
* Prepublish an agenda as HTML+RDFa snippet for a given document
* The snippet is not persisted in the store
*/
router.get("/prepublish/agenda/:kindUuid/:meetingUuid", async function (req, res, next) {
  try {
    const html = await constructHtmlForAgenda(req.params.meetingUuid, req.params.kindUuid);
    return res
      .send({
        data: {attributes: {content: html}, type: "imported-agenda-contents"},
      })
      .end();
  } catch (err) {
    console.log(err);
    const error = new Error(
      `An error occurred while fetching contents for prepublished agenda ${
        req.params.zittingIdentifier
      }: ${err}`
    );
    // @ts-ignore
    error.status = 500;
    return next(error);
  }
});

/**
* Prepublish a besluitenlijst as HTML+RDFa snippet for a given document
* The snippet is not persisted in the store
*/
router.get('/prepublish/besluitenlijst/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForBesluitenlijst(req.params.zittingIdentifier);
    const {html, errors} = await buildBesluitenLijstForZitting(zitting);
    return res.send( { data: { attributes: { content: html, errors }, type: "imported-besluitenlijst-contents" } } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while fetching contents for prepublished besluitenlijst ${req.params.zittingIdentifier}: ${err}`);
    // @ts-ignore
    error.status = 500;
    return next(error);
  }
});

/**
 * Prepublish besluiten as HTML+RDFa snippet for a given document
 * The snippets are not persisted in the store
 */
router.get('/prepublish/behandelingen/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForBehandeling(req.params.zittingIdentifier);
    const behandeling = await extractBehandelingVanAgendapuntenFromZitting(zitting);
    return res.send(behandeling).end();
  }
  catch (err) {
    console.log(err);
    const error = new Error(`An error occured while fetching contents for prepublished besluiten ${req.params.documentIdentifier}: ${err}`);
    // @ts-ignore
    error.status = 500;
    return next(error);
  }
});

/**
* Prepublish notulen as HTML+RDFa snippet for a given document
* The snippet is not persisted in the store
*/
router.get('/prepublish/notulen/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForNotulen( req.params.zittingIdentifier );
    const {html, errors} = await extractNotulenContentFromZitting(zitting);
    return res.send( { data: { attributes: { content: html, errors }, type: "imported-notulen-contents" } } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while fetching contents for prepublished notulen ${req.params.zittingIdentifier}: ${err}`);
    // @ts-ignore
    error.status = 500;
    return next(error);
  }
});

export default router;
