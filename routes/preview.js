import express from 'express';
import {getZittingForNotulen} from '../support/notulen-queries';
import {buildBesluitenLijstForMeetingId} from '../support/besluit-exporter';
import {extractNotulenContentFromZitting, constructHtmlForMeetingNotes} from '../support/notule-exporter';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
import {constructHtmlForAgenda } from '../support/agenda-utils';
import InvalidRequest from '../support/invalid-request';
import {parseBody} from '../support/parse-body';
import {buildExtractData, constructHtmlForExtract, buildAllExtractsForMeeting} from '../support/extract-utils';
import {uuid} from 'mu';
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
router.get('/prepublish/besluitenlijst/:meetingUuid', async function(req, res, next) {
  try {
    const {html, errors} = await buildBesluitenLijstForMeetingId(req.params.meetingUuid);
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
    const extracts = await buildAllExtractsForMeeting(req.params.zittingIdentifier);
    return res.send(extracts).end();
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
    const {html, errors} = await constructHtmlForMeetingNotes(req.params.zittingIdentifier);
    return res.send( { data: { attributes: { content: html, errors }, type: "imported-notulen-contents" } } ).end();
  }
  catch(e) {
    console.error(e);
    const error = new Error(`An error occurred while fetching contents for prepublished notulen ${req.params.zittingIdentifier}: ${err}`);
    // @ts-ignore
    error.status = 500;
    return next(error);
  }
  // try {
  //   const zitting = await getZittingForNotulen( req.params.zittingIdentifier );
  //   const {html, errors} = await extractNotulenContentFromZitting(zitting);
  //   return res.send( { data: { attributes: { content: html, errors }, type: "imported-notulen-contents" } } ).end();
  // } catch (err) {
  //   console.log(err);
  //   const error = new Error(`An error occurred while fetching contents for prepublished notulen ${req.params.zittingIdentifier}: ${err}`);
  //   // @ts-ignore
  //   error.status = 500;
  //   return next(error);
  // }
});

router.post('/meeting-notes-previews', async function(req, res, next) {



});

router.post('/extract-previews', async function (req, res, next) {
  try {
    const {relationships} = parseBody(req.body);
    const treatmentUuid = relationships?.treatment?.id;
    if (!treatmentUuid) {
      throw new InvalidRequest("no valid treatment provided");
    }
    const extractData = await buildExtractData(treatmentUuid);
    const html = constructHtmlForExtract(extractData);

    const errors = validateMeeting(extractData.meeting);
    errors.concat(validateTreatment(extractData.treatment));
    return res.status(201).send(
      {
        data: {
          type: "extract-preview",
          id: uuid(),
          attributes: {
            html: html
          }
        },
        relationships: {
          treatment: {
            data: {
              id: treatmentUuid,
              type: "behandeling-van-agendapunt"
            }
          }
        }
      }
    ).end();
  }
  catch(e) {
    if (e.constructor.name === InvalidRequest.name) {
      return res.status(400).send(
        {errors: [{title: 'invalid request'}]}).end();
    }
    else {
      const error = new Error(`An error occurred while building the extract preview: ${e}`
      );
      // @ts-ignore
      console.error(e);
      error.status = 500;
      return next(error);
    }
  }
});
export default router;
