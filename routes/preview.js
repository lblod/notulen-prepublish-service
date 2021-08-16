import express from 'express';
import { uuid } from 'mu';
import { constructHtmlForAgenda } from '../support/agenda-utils';
import { buildBesluitenLijstForMeetingId, publishVersionedBesluitenlijst } from '../support/besluit-exporter';
import { buildAllExtractsForMeeting, buildExtractData, constructHtmlForExtract } from '../support/extract-utils';
import InvalidRequest from '../support/invalid-request';
import { constructHtmlForMeetingNotes } from '../support/notulen-utils';
import { parseBody } from '../support/parse-body';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
const router = express.Router();

/***
 *
 * PREPUBLICATION ENDPOINTS
 *
 */

/**
 * Contains the job results.
 */
const prepublishJobResults = new Map();

/**
 * Adds a job result.
 *
 * @param {string} uuid The uuid of the job.
 * @param {number} status HTTP status code.
 * @param {object} result The response to send to the user.
 */
function pushJobResult( uuid, status, result ) {
  prepublishJobResults.set( uuid, { status, result } );
}

/**
 * Creates a new job.
 *
 * @param res Ngenix response object.
 * @return job Uuid
 */
function yieldJobId(res) {
  const jobUuid = uuid();
  res
    .status(200)
    .send({
      data: {
        attributes: {
          jobId: jobUuid
        },
        type: "prebulish-jobs"
      }
    });

  return jobUuid;
}

router.get('/prepublish/job-result/:jobUuid', (req, res) => {
  const jobUuid = req.params.jobUuid;

  if( prepublishJobResults.has(jobUuid) ) {
    const { status, result } = prepublishJobResults.get(jobUuid);
    prepublishJobResults.delete(jobUuid);
    res
      .status( status )
      .send( result );
  } else {
    res
      .status( 404 )
      .send("UUID not found, production may be ongoing yet.");
  }
});


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
router.get('/prepublish/behandelingen/:zittingIdentifier', async function(req, res) {
  const jobUuid = yieldJobId( res );

  try {
    const extracts = await buildAllExtractsForMeeting(req.params.zittingIdentifier);
    pushJobResult(jobUuid, 200, extracts);
    // return res.send(extracts).end();
  }
  catch (err) {
    console.log(err);
    const errorString = `An error occured while fetching contents for prepublished besluiten ${req.params.zittingIdentifier}: ${err}`;
    pushJobResult(jobUuid, 500, errorString);
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
    const error = new Error(`An error occurred while fetching contents for prepublished notulen ${req.params.zittingIdentifier}: ${e}`);
    // @ts-ignore
    error.status = 500;
    return next(error);
  }
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
