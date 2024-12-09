import {
  query,
  sparqlEscapeDateTime,
  sparqlEscapeInt,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
  uuid,
} from 'mu';
import { prefixMap } from '../support/prefixes';

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
  constructor({ id, uri, message }) {
    if (uri) {
      // we don't want to generate a new id if we got a uri, even if it's null
      this.id = id;
      this.uri = uri;
    } else {
      this.id = id ?? uuid();
      this.uri = `http://redpencil.data.gift/id/jobs/error/${this.id}`;
    }

    this.message = message;
  }
}

export default class Task {
  static async create(meeting, type) {
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

  static async find(uuid) {
    const result = await query(`
     ${prefixMap['mu'].toSparqlString()}
     ${prefixMap['nuao'].toSparqlString()}
     ${prefixMap['task'].toSparqlString()}
     ${prefixMap['dct'].toSparqlString()}
     ${prefixMap['adms'].toSparqlString()}
     ${prefixMap['oslc'].toSparqlString()}
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
       OPTIONAL {
	 ?uri task:error ?error.
         ?error mu:uuid ?errorId.
         ?error oslc:message ?errorMessage.
       }
     }
   `);
    if (result.results.bindings.length) {
      return Task.fromBinding(result.results.bindings[0]);
    } else return null;
  }

  static async query({ meetingUri, type, userUri = null }) {
    const result = await query(`
     ${prefixMap['mu'].toSparqlString()}
     ${prefixMap['nuao'].toSparqlString()}
     ${prefixMap['task'].toSparqlString()}
     ${prefixMap['dct'].toSparqlString()}
     ${prefixMap['adms'].toSparqlString()}
     ${prefixMap['oslc'].toSparqlString()}
     SELECT ?uri ?uuid ?type ?involves ?status ?modified ?created ?error ?errorId ?errorMessage WHERE {
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
        type: type,
        involves: meetingUri,
      });
    } else return null;
  }

  static fromBinding(binding) {
    let taskError = null;
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

  constructor({ id, uri, created, status, modified, type, involves, error }) {
    this.id = id;
    this.type = type;
    this.involves = involves;
    this.created = created;
    this.modified = modified;
    this.status = status;
    this.uri = uri;
    this.error = error;
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
