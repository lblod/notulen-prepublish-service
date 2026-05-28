// @ts-strict-ignore

import express from 'express';
import Meeting from '../models/meeting.js';
import Treatment from '../models/treatment.js';
import SignedResource from '../models/signed-resource.js';
import { ensureTask, returnEnsuredTaskId } from '../support/task-utils.js';
import {
  TASK_STATUS_FAILURE,
  TASK_STATUS_RUNNING,
  TASK_STATUS_SUCCESS,
  TASK_TYPE_SIGNING_DECISION_LIST,
  TASK_TYPE_SIGNING_MEETING_NOTES,
  TASK_TYPE_SIGNING_VERSIONED_TREATMENT,
} from '../models/task.js';
import validateMeeting from '../support/validate-meeting.js';
import validateTreatment from '../support/validate-treatment.js';
import {
  ensureVersionedAgendaForMeeting,
  signVersionedAgenda,
} from '../support/agenda-utils.js';
import {
  ensureVersionedBesluitenLijstForZitting,
  signVersionedBesluitenlijst,
} from '../support/besluit-exporter.js';
import {
  ensureVersionedNotulen,
  NOTULEN_KIND_FULL,
  signVersionedNotulen,
} from '../support/notulen-utils.js';
import {
  ensureVersionedExtract,
  signVersionedExtract,
} from '../support/extract-utils.js';
import { fetchCurrentUser } from '../support/query-utils.js';
import {
  getCurrentVersion,
  getLinkedDocuments,
} from '../support/editor-document-utils.js';
import {
  ensureVersionedRegulatoryStatement,
  signVersionedRegulatoryStatement,
} from '../support/regulatory-statement-utils.js';
import { getUri } from '../support/resource-utils.js';

import { parseBody } from '../support/parse-body.js';
import VersionedExtract from '../models/versioned-behandeling.js';
/** @import Task from '../models/task' */

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
router.post(
  '/signing/agenda/sign/:agendaKindUuid/:meetingUuid',
  async function (req, res, next) {
    try {
      const prepublishedAgendaUri = await ensureVersionedAgendaForMeeting(
        req.params.meetingUuid,
        req.params.agendaKindUuid
      );
      await signVersionedAgenda(
        prepublishedAgendaUri,
        req.header('MU-SESSION-ID'),
        'getekend'
      );
      return res.send({ success: true }).end();
    } catch (err) {
      console.error('Error signing agenda', err);
      const error = new Error(
        `An error occurred while signing the agenda ${req.params.meetingUuid}: ${err}`
      );
      return next(error);
    }
  }
);

/**
 * Makes the current user sign the besluitenlijst for the supplied document.
 * Ensures the prepublished besluitenlijst that is signed is persisted in the store and attached to the document container
 */
router.post(
  '/signing/besluitenlijst/sign/:zittingIdentifier',
  async function (req, res, next) {
    /** @type {Task} */
    let signingTask;
    try {
      const meetingUuid = req.params.zittingIdentifier;
      const [meeting, userUri] = await Promise.all([
        Meeting.find(meetingUuid),
        fetchCurrentUser(req.header('MU-SESSION-ID')),
      ]);
      signingTask = await returnEnsuredTaskId(
        res,
        meeting,
        TASK_TYPE_SIGNING_DECISION_LIST,
        userUri
      );
    } catch (err) {
      console.error('Error signing decision list', err);
      const error = new Error(
        `An error occurred while signing the besluitenlijst ${req.params.zittingIdentifier}: ${err}`
      );
      return next(error);
    }
    try {
      await signingTask.updateStatus(TASK_STATUS_RUNNING);
      const prepublishedBesluitenlijstUri =
        await ensureVersionedBesluitenLijstForZitting(
          req.params.zittingIdentifier
        );
      await signVersionedBesluitenlijst(
        prepublishedBesluitenlijstUri,
        req.header('MU-SESSION-ID'),
        'getekend'
      );
      await signingTask.updateStatus(TASK_STATUS_SUCCESS);
    } catch (err) {
      signingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
    }
  }
);

/**
 * Makes the current user sign the provided behandeling for the supplied document.
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
router.post(
  '/signing/behandeling/sign/:zittingIdentifier/:behandelingUuid',
  async function (req, res, next) {
    try {
      const [meeting, treatment] = await Promise.all([
        Meeting.find(req.params.zittingIdentifier),
        Treatment.find(req.params.behandelingUuid),
      ]);
      const meetingErrors = validateMeeting(meeting);
      const treatmentErrors = await validateTreatment(treatment);
      const errors = [...meetingErrors, ...treatmentErrors];
      if (errors.length) {
        return res.status(400).send({ errors }).end();
      } else {
        const extractUri = await ensureVersionedExtract(treatment, meeting);
        await signVersionedExtract(
          extractUri,
          req.header('MU-SESSION-ID'),
          'getekend',
          treatment.attachments
        );
        const treatmentEditorDocumentUri = await getUri(
          treatment.editorDocumentUuid
        );
        const linkedRegulatoryStatementContainers = await getLinkedDocuments(
          treatmentEditorDocumentUri
        );
        const linkedRegulatoryStatementDocuments = await Promise.all(
          linkedRegulatoryStatementContainers.map(async (containerURI) =>
            getCurrentVersion(containerURI)
          )
        );
        const versionedRegulatoryStatements = await Promise.all(
          linkedRegulatoryStatementDocuments.map(async (doc) =>
            ensureVersionedRegulatoryStatement(doc, extractUri)
          )
        );
        await Promise.all(
          versionedRegulatoryStatements.map(async (versionedStatementUri) =>
            signVersionedRegulatoryStatement(
              versionedStatementUri,
              req.header('MU-SESSION-ID'),
              'getekend'
            )
          )
        );
        return res.send({ success: true }).end();
      }
    } catch (err) {
      console.error('Error signing behandeling', err);
      const error = new Error(
        `An error occurred while signing the behandeling ${req.params.behandelingUuid}: ${err}`
      );
      return next(error);
    }
  }
);

router.post(
  '/signing/uittreksel/sign/:versionedTreatmentId',
  async function (req, res, next) {
    /** @type {Treatment | undefined} */
    let treatment;
    /** @type {Meeting | undefined} */
    let meeting;
    /** @type {Task | undefined} */
    let signingTask;
    try {
      if (req.params.versionedTreatmentId) {
        const versionedTreatment = await VersionedExtract.find(
          req.params.versionedTreatmentId
        );
        treatment = await Treatment.findUri(versionedTreatment.treatment);
        meeting = await Meeting.findURI(treatment.meeting);
        signingTask = await returnEnsuredTaskId(
          res,
          meeting,
          TASK_TYPE_SIGNING_VERSIONED_TREATMENT
        );
      }
    } catch (err) {
      console.error('Error while creating signed resource task', err);
      const error = new Error(
        `An error occurred while signing the resource task: ${err}`
      );
      return next(error);
    }
    try {
      if (treatment && meeting && signingTask) {
        signingTask = await signingTask.updateStatus(TASK_STATUS_RUNNING);
        const meetingErrors = validateMeeting(meeting);
        const treatmentErrors = await validateTreatment(treatment);
        const errors = [...meetingErrors, ...treatmentErrors];
        if (errors.length) {
          await signingTask.updateStatus(
            TASK_STATUS_FAILURE,
            errors.join('; ')
          );
        } else {
          const versionedExtractUri = await ensureVersionedExtract(
            treatment,
            meeting
          );

          await signVersionedExtract(
            versionedExtractUri,
            req.header('MU-SESSION-ID'),
            'getekend',
            treatment.attachments
          );
          signingTask.updateStatus(TASK_STATUS_SUCCESS);
        }
      }
    } catch (err) {
      console.error('Error while signing extract', err);
      await signingTask?.updateStatus(TASK_STATUS_FAILURE, err.message);
    }
  }
);
/**
 * Creates a signed resource for the provided resource (currently only a treatment is supported)
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
router.post('/signed-resources', async function (req, res, next) {
  /** @type {Task | undefined} */
  let signingTask;
  try {
    const { relationships } = parseBody(req.body);
    // @ts-ignore we could move to zod to get nice types here
    const versionedTreatmentUuid = relationships?.['versioned-behandeling']?.id;
    if (versionedTreatmentUuid) {
      const versionedTreatment = await VersionedExtract.find(
        versionedTreatmentUuid
      );
      const treatment = await Treatment.findUri(versionedTreatment.treatment);
      const meeting = await Meeting.findURI(treatment.meeting);
      // Use a task but only for concurrency protection. Requests may timeout.
      signingTask = await ensureTask(
        meeting,
        TASK_TYPE_SIGNING_VERSIONED_TREATMENT
      );
      signingTask = await signingTask.updateStatus(TASK_STATUS_RUNNING);

      const meetingErrors = validateMeeting(meeting);
      const treatmentErrors = await validateTreatment(treatment);
      const errors = [...meetingErrors, ...treatmentErrors];
      if (errors.length) {
        return res.status(400).send({ errors }).end();
      } else {
        const versionedExtractUri = await ensureVersionedExtract(
          treatment,
          meeting
        );

        const signedResourceUri = await signVersionedExtract(
          versionedExtractUri,
          req.header('MU-SESSION-ID'),
          'getekend',
          treatment.attachments
        );
        const signedResource = await SignedResource.findURI(signedResourceUri);
        await signingTask.updateStatus(TASK_STATUS_SUCCESS);
        return res.send(signedResource.toMuResourceModel());
      }
    }
  } catch (err) {
    console.error('Error while creating signed resource', err);
    const error = new Error(
      `An error occurred while signing the resource: ${err}`
    );
    await signingTask?.updateStatus(TASK_STATUS_FAILURE, err.message);
    return next(error);
  }
});

/**
 * Makes the current user sign the notulen for the supplied document.
 * Ensures the prepublished notulen that are signed are persisted in the store and attached to the document container
 */
router.post(
  '/signing/notulen/sign/:zittingIdentifier',
  async function (req, res, next) {
    /** @type {Task | undefined} */
    let signingTask;
    try {
      const meetingUuid = req.params.zittingIdentifier;
      const [meeting, userUri] = await Promise.all([
        Meeting.find(meetingUuid),
        fetchCurrentUser(req.header('MU-SESSION-ID')),
      ]);
      signingTask = await returnEnsuredTaskId(
        res,
        meeting,
        TASK_TYPE_SIGNING_MEETING_NOTES,
        userUri
      );
    } catch (err) {
      console.error('Error attempting to create signing task', err);
      await signingTask?.updateStatus(TASK_STATUS_FAILURE, err.message);
      const error = new Error(
        `An error occurred while signing the meeting notes ${req.params.zittingIdentifier}: ${err}`
      );
      return next(error);
    }

    try {
      signingTask = await signingTask.updateStatus(TASK_STATUS_RUNNING);
      const meetingUuid = req.params.zittingIdentifier;
      const [meeting, treatments] = await Promise.all([
        Meeting.find(meetingUuid),
        Treatment.findAll({ meetingUuid }),
      ]);
      let errors = validateMeeting(meeting);
      const attachments = [];
      for (const treatment of treatments) {
        const treatmentErrors = await validateTreatment(treatment);
        errors = [...errors, ...treatmentErrors];
        attachments.push(...treatment.attachments);
      }
      if (errors.length) {
        throw new Error(errors.join(', '));
      }
      const versionedNotulenUri = await ensureVersionedNotulen(
        meeting,
        treatments,
        NOTULEN_KIND_FULL
      );
      await signVersionedNotulen(
        versionedNotulenUri,
        req.header('MU-SESSION-ID'),
        'getekend',
        attachments
      );

      await signingTask.updateStatus(TASK_STATUS_SUCCESS);
    } catch (err) {
      console.error('Error signing notulen', err);
      await signingTask.updateStatus(TASK_STATUS_FAILURE, err.message);
    }
  }
);

export default router;
