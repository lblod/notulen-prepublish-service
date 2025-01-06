// @ts-nocheck

import express from 'express';
/** @import { Request, RequestHandler, Response } from 'express' */
import { uuid } from 'mu';
import { constructHtmlForAgenda } from '../support/agenda-utils';
import { buildBesluitenLijstForMeetingId } from '../support/besluit-exporter';
import {
  buildAllExtractsForMeeting,
  buildExtractData,
  constructHtmlForExtract,
} from '../support/extract-utils';
import InvalidRequest from '../support/invalid-request';
import { constructHtmlForMeetingNotes } from '../support/notulen-utils';
import { parseBody } from '../support/parse-body';
import validateMeeting from '../support/validate-meeting';
import validateTreatment from '../support/validate-treatment';
import { IS_PREVIEW } from '../support/constants';
import {
  generateNotulenPreview,
  NOTULEN_KIND_PUBLIC,
} from '../support/notulen-utils';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
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
function pushJobResult(uuid, status, result) {
  prepublishJobResults.set(uuid, { status, result });
}

/**
 * Creates a new job.
 *
 * @param {Response} res Express response object.
 * @param {number} [status=200] status code to send when created.
 * @return job Uuid
 */
function yieldJobId(res, status = 200) {
  const jobUuid = uuid();
  res.status(status).send({
    data: {
      attributes: {
        jobId: jobUuid,
      },
      type: 'prepublish-jobs',
    },
  });

  return jobUuid;
}

/**
 * Create a job, then call the handler to do the work. Handles setting an error status and logging
 * if the handler throws.
 * A job is like a Task, but the state lives entirely in server memory, so is intended for
 * non-critical behaviour.
 * @param {(req: Request) => Promise<object>} handler
 * @param {(req: Request, err: unknown) => string} errorMsgGenerator use the context of the request
 * and the error to produce a message
 * @param {number} [status=200] status code to send when created.
 * @return {RequestHandler}
 */
function handleWithJob(handler, errorMsgGenerator, status = 200) {
  return async (req, res) => {
    const jobUuid = yieldJobId(res);

    try {
      const data = await handler(req);
      pushJobResult(jobUuid, status, data);
    } catch (err) {
      console.error(err);
      const errorString = errorMsgGenerator(req, err);
      pushJobResult(jobUuid, (typeof err === 'object' && err?.status) ?? 500, [
        { title: errorString },
      ]);
    }
  };
}

router.get('/prepublish/job-result/:jobUuid', (req, res) => {
  const jobUuid = req.params.jobUuid;

  if (prepublishJobResults.has(jobUuid)) {
    let { status, result } = prepublishJobResults.get(jobUuid);
    prepublishJobResults.delete(jobUuid);
    if (status === 404) {
      // 404 is used to signify 'keep polling for a result', so we need to avoid sending it
      status = 400;
    }
    res.status(status).send(result);
  } else {
    res.status(404).send('UUID not found, production may be ongoing yet.');
  }
});

/**
 * Prepublish an agenda as HTML+RDFa snippet for a given document
 * The snippet is not persisted in the store
 */
router.get(
  '/prepublish/agenda/:kindUuid/:meetingUuid',
  async function (req, res, next) {
    try {
      const html = await constructHtmlForAgenda(
        req.params.meetingUuid,
        req.params.kindUuid
      );
      return res
        .send({
          data: {
            attributes: { content: html },
            type: 'imported-agenda-contents',
          },
        })
        .end();
    } catch (err) {
      console.log(err);
      const error = new Error(
        `An error occurred while fetching contents for prepublished agenda ${req.params.zittingIdentifier}: ${err}`
      );
      error.status = 500;
      return next(error);
    }
  }
);

/**
 * Prepublish a besluitenlijst as HTML+RDFa snippet for a given document
 * The snippet is not persisted in the store
 */
router.get(
  '/prepublish/besluitenlijst/:meetingUuid',
  handleWithJob(
    async (req) => {
      const { html, errors } = await buildBesluitenLijstForMeetingId(
        req.params.meetingUuid
      );
      return {
        data: {
          attributes: { content: html, errors },
          type: 'imported-besluitenlijst-contents',
        },
      };
    },
    (req, err) => {
      return `An error occurred while fetching contents for prepublished besluitenlijst ${req.params.zittingIdentifier}: ${err}`;
    }
  )
);

/**
 * Prepublish besluiten as HTML+RDFa snippet for a given document
 * The snippets are not persisted in the store
 */
router.get(
  '/prepublish/behandelingen/:zittingIdentifier',
  handleWithJob(
    async (req) => {
      const extracts = await buildAllExtractsForMeeting(
        req.params.zittingIdentifier
      );
      return extracts;
    },
    (req, err) =>
      `An error occured while fetching contents for prepublished besluiten ${req.params.zittingIdentifier}: ${err}`
  )
);

/**
 * Prepublish notulen as HTML+RDFa snippet for a given document
 * The snippet is not persisted in the store
 */
router.get(
  '/prepublish/notulen/:zittingIdentifier',
  handleWithJob(
    async (req) => {
      const { html, errors } = await constructHtmlForMeetingNotes(
        req.params.zittingIdentifier,
        true
      );
      return {
        data: {
          attributes: { content: html, errors },
          type: 'imported-notulen-contents',
        },
      };
    },
    (req, err) =>
      `An error occurred while fetching contents for prepublished notulen ${req.params.zittingIdentifier}: ${err}`
  )
);

router.post('/extract-previews', async function (req, res, next) {
  try {
    const { relationships } = parseBody(req.body);
    const treatmentUuid = relationships?.treatment?.id;
    if (!treatmentUuid) {
      throw new InvalidRequest('no valid treatment provided');
    }
    const extractData = await buildExtractData(treatmentUuid, IS_PREVIEW);
    const html = constructHtmlForExtract(extractData);

    let errors = validateMeeting(extractData.meeting);
    errors = errors.concat(await validateTreatment(extractData.treatment));
    return res
      .status(201)
      .send({
        data: {
          type: 'extract-previews',
          id: uuid(),
          attributes: {
            html: html,
            'validation-errors': errors,
          },
          relationships: {
            treatment: {
              data: {
                id: treatmentUuid,
                type: 'treatments',
              },
            },
            meeting: {
              data: {
                id: extractData.meeting.uuid,
                type: 'meetings',
              },
            },
          },
        },
      })
      .end();
  } catch (e) {
    if (e.constructor.name === InvalidRequest.name) {
      return res
        .status(400)
        .send({ errors: [{ title: 'invalid request' }] })
        .end();
    } else {
      const error = new Error(
        `An error occurred while building the extract preview: ${e}`
      );
      console.error(e);
      error.status = 500;
      return next(error);
    }
  }
});

router.post(
  '/meeting-notes-previews',
  handleWithJob(
    async (req) => {
      const { relationships } = parseBody(req.body);
      const meetingUuid = relationships?.meeting?.id;
      const publicBehandelingUris =
        relationships?.publicTreatments?.map(
          (publicTreatment) => publicTreatment.id
        ) || [];

      const meeting = await Meeting.find(meetingUuid);
      const treatments = await Treatment.findAll({ meetingUuid });
      const publicationHtml = await generateNotulenPreview(
        meeting,
        treatments,
        NOTULEN_KIND_PUBLIC,
        publicBehandelingUris
      );
      return {
        data: {
          type: 'notulen-final-previews',
          id: uuid(),
          attributes: {
            html: publicationHtml,
          },
        },
        relationships: {
          meeting: {
            data: {
              id: meetingUuid,
              type: 'meetings',
            },
          },
        },
      };
    },
    (req, err) => {
      try {
        const { relationships } = parseBody(req.body);
        const meetingUuid = relationships?.meeting?.id;
        return `An error occurred while creating meeting notes preview for ${meetingUuid}: ${err}`;
      } catch (error) {
        console.error('Error when trying to handle another error', error);
        return `An error occurred while creating meeting notes preview: ${err}`;
      }
    },
    201
  )
);

export default router;
