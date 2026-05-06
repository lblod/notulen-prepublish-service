import {
  query,
  sparqlEscapeDateTime,
  sparqlEscapeInt,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
} from 'mu';
import { v1 as uuid } from 'uuid';
import { prefixMap } from '../support/prefixes.js';
import AppError from '../support/error-utils.js';
/** @import Meeting from './meeting' */
/** @import { BindingObject } from 'mu' */

export const TASK_TYPE_SIGNING_DECISION_LIST = 'decisionListSignature';
export const TASK_TYPE_PUBLISHING_DECISION_LIST = 'decisionListPublication';
export const TASK_TYPE_SIGNING_MEETING_NOTES = 'meetingNotesSignature';
export const TASK_TYPE_PUBLISHING_MEETING_NOTES = 'meetingNotesPublication';
export const TASK_STATUS_FAILURE =
  'http://lblod.data.gift/besluit-publicatie-melding-statuses/failure';
export const TASK_STATUS_CREATED =
  'http://lblod.data.gift/besluit-publicatie-melding-statuses/created';
export const TASK_STATUS_SUCCESS =
  'http://lblod.data.gift/besluit-publicatie-melding-statuses/success';
export const TASK_STATUS_RUNNING =
  'http://lblod.data.gift/besluit-publicatie-melding-statuses/ongoing';
export class TaskError {
  /**
   * @typedef {object} TaskErrorArgs
   * @property {string} [id]
   * @property {string} [uri]
   * @property {string} message
   */
  /** @param {TaskErrorArgs} args */
  constructor({ id, uri, message }) {
    if (uri) {
      // we don't want to generate a new id if we got a uri, even if it's null
      /** @type {string | undefined} */
      this.id = id;
      /** @type {string} */
      this.uri = uri;
    } else {
      this.id = id ?? uuid();
      this.uri = `http://redpencil.data.gift/id/jobs/error/${this.id}`;
    }

    /** @type {string} */
    this.message = message;
  }
}

export default class Task {
  /**
   * @param {Meeting} meeting
   * @param {string} type
   * @param {string} userUri
   * @returns {Promise<Task>}
   */
  static async create(meeting, type, userUri) {
    const id = uuid();
    const uri = `http://lblod.data.gift/tasks/${id}`;
    const created = Date.now();
    const queryString = `
     PREFIX    mu: <http://mu.semte.ch/vocabularies/core/>
     PREFIX    nuao: <http://www.semanticdesktop.org/ontologies/2010/01/25/nuao#>
     PREFIX    task: <http://redpencil.data.gift/vocabularies/tasks/>
     PREFIX    dct: <http://purl.org/dc/terms/>
     PREFIX    adms: <http://www.w3.org/ns/adms#>
     INSERT DATA {
        ${sparqlEscapeUri(uri)} a task:Task;
        mu:uuid ${sparqlEscapeString(id)};
        adms:status ${sparqlEscapeUri(TASK_STATUS_CREATED)};
        task:numberOfRetries ${sparqlEscapeInt(0)};
        dct:created ${sparqlEscapeDateTime(created)};
        dct:modified ${sparqlEscapeDateTime(created)};
        dct:creator <http://lblod.data.gift/services/notulen-prepublish-service>;
        dct:type ${sparqlEscapeString(type)};
        ${userUri ? `nuao:involves ${sparqlEscapeUri(userUri)};` : ''}
        nuao:involves ${sparqlEscapeUri(meeting.uri)}.
    }
  `;
    await update(queryString);
    return new Task({
      id,
      type,
      involves: meeting.uri,
      created,
      modified: created,
      status: TASK_STATUS_CREATED,
      uri,
    });
  }

  /**
   * @param {string} uuid
   * @returns {Promise<Task>}
   */
  static async find(uuid) {
    const result = await query(`
     ${prefixMap['mu'].toSparqlString()}
     ${prefixMap['nuao'].toSparqlString()}
     ${prefixMap['task'].toSparqlString()}
     ${prefixMap['dct'].toSparqlString()}
     ${prefixMap['adms'].toSparqlString()}
     ${prefixMap['oslc'].toSparqlString()}
     ${prefixMap['besluit'].toSparqlString()}
     SELECT ?uri ?uuid ?type ?involves ?status ?modified ?created ?error ?errorId ?errorMessage WHERE {
       BIND(${sparqlEscapeString(uuid)} AS ?uuid)
       ?uri a task:Task;
            mu:uuid ?uuid;
            dct:type ?type;
            dct:created ?created;
            dct:modified ?modified;
            nuao:involves ?involves;
            dct:creator <http://lblod.data.gift/services/notulen-prepublish-service>;
            adms:status ?status.
        ?involves a besluit:Zitting.
       OPTIONAL {
         ?uri task:error ?error.
         ?error mu:uuid ?errorId.
         ?error oslc:message ?errorMessage.
       }
     }
   `);
    if (result.results.bindings.length) {
      return Task.fromBinding(result.results.bindings[0]);
    }
    throw new AppError(404, `task with id ${uuid} was not found`);
  }

  /**
   * @typedef {object} QueryArgs
   * @property {string} meetingUri
   * @property {string} type
   * @property {string | null} [userUri]
   */
  /**
   * @param {QueryArgs} args
   * @returns {Promise<Task | null>}
   */
  static async query({ meetingUri, type, userUri = null }) {
    const result = await query(`
     ${prefixMap['mu'].toSparqlString()}
     ${prefixMap['nuao'].toSparqlString()}
     ${prefixMap['task'].toSparqlString()}
     ${prefixMap['dct'].toSparqlString()}
     ${prefixMap['adms'].toSparqlString()}
     ${prefixMap['oslc'].toSparqlString()}
     SELECT ?uri ?uuid ?status ?modified ?created ?error ?errorId ?errorMessage WHERE {
       ?uri a task:Task;
            mu:uuid ?uuid;
            dct:type ${sparqlEscapeString(type)};
            dct:created ?created;
            dct:modified ?modified;
            nuao:involves ${sparqlEscapeUri(meetingUri)};
            dct:creator <http://lblod.data.gift/services/notulen-prepublish-service>;
            adms:status ?status.

       OPTIONAL {
         ?uri task:error ?error.
         ?error mu:uuid ?errorId.
         ?error oslc:message ?errorMessage.
       }
       ${userUri ? `?uri nuao:involves ${sparqlEscapeUri(userUri)}.` : ''}
     }
   `);
    if (result.results.bindings.length) {
      return Task.fromBinding({
        ...result.results.bindings[0],
        type: { type: 'string', value: type },
        involves: { type: 'uri', value: meetingUri },
      });
    } else return null;
  }

  /**
   * @param {BindingObject} binding
   * @returns {Task}
   */
  static fromBinding(binding) {
    let taskError = undefined;
    if (binding.error?.value) {
      taskError = new TaskError({
        uri: binding.error.value,
        id: binding.errorId?.value,
        message: binding.errorMessage?.value,
      });
    }

    return new Task({
      id: binding.uuid.value,
      uri: binding.uri.value,
      created: binding.created.value,
      modified: binding.modified.value,
      status: binding.status.value,
      involves: binding.involves.value,
      type: binding.type.value,
      error: taskError,
    });
  }

  /**
   * @typedef {object} TaskArgs
   * @property {string} id
   * @property {string} type
   * @property {string} involves - The meeting that this task acts on
   * @property {string} created
   * @property {string} modified
   * @property {string} status
   * @property {string} uri
   * @property {TaskError} [error]
   */
  /** @param {TaskArgs} taskArgs */
  constructor({ id, uri, created, status, modified, type, involves, error }) {
    /** @type {string} */
    this.id = id;
    /** @type {string} */
    this.type = type;
    /** @type {string} - The meeting that this task acts on */
    this.involves = involves;
    /** @type {string} */
    this.created = created;
    /** @type {string} */
    this.modified = modified;
    /** @type {string} */
    this.status = status;
    /** @type {string} */
    this.uri = uri;
    /** @type {TaskError | null} */
    this.error = error ?? null;
  }

  async updateStatus(status, reason) {
    let taskError = null;
    if (reason) {
      taskError = new TaskError({ message: reason });
    }
    //prettier-ignore
    const queryString = `
     ${prefixMap["mu"].toSparqlString()}
     ${prefixMap["task"].toSparqlString()}
     ${prefixMap["adms"].toSparqlString()}
     ${prefixMap["oslc"].toSparqlString()}

     DELETE {
       ?uri adms:status ?status.
       ?uri task:error ?error.
       ?error ?errorP ?errorV.
     }
     INSERT {
       ?uri adms:status ${sparqlEscapeUri(status)}.
       ${
         taskError
           ? `?uri task:error ${sparqlEscapeUri(taskError.uri)}.
	      ${sparqlEscapeUri(taskError.uri)} a oslc:Error.
	      ${sparqlEscapeUri(taskError.uri)} mu:uuid ${sparqlEscapeString(taskError.id)}. 
	      ${sparqlEscapeUri(taskError.uri)} oslc:message ${sparqlEscapeString(taskError.message)}.`
           : ''
       }
     }
     WHERE {
       ?uri a task:Task;
            mu:uuid ${sparqlEscapeString(this.id)};
            adms:status ?status.
       OPTIONAL {
         ?uri task:error ?error.
         ?error ?errorP ?errorV.
       }
    }`;
    await update(queryString);
    this.status = status;

    this.error = taskError;
  }
}
