import {prefixMap} from "../support/prefixes";
// @ts-ignore
import {query, sparqlEscapeString, sparqlEscapeUri} from "mu";
import Attachment from './attachment';

export default class Treatment {
  static async findAll({meetingUuid}) {
    const queryString = `
     ${prefixMap.get("besluit").toSparqlString()}
     ${prefixMap.get("dct").toSparqlString()}
     ${prefixMap.get("schema").toSparqlString()}
     ${prefixMap.get("mu").toSparqlString()}
     ${prefixMap.get("skos").toSparqlString()}
     ${prefixMap.get("ext").toSparqlString()}
     ${prefixMap.get("mu").toSparqlString()}
     ${prefixMap.get("pav").toSparqlString()}
      SELECT * WHERE {
          ?meeting a besluit:Zitting;
                   mu:uuid ${sparqlEscapeString(meetingUuid)};
                   besluit:behandelt ?agendapoint.
          ?agendapoint schema:position ?position.
          ?uri a besluit:BehandelingVanAgendapunt;
               mu:uuid ?uuid;
               dct:subject ?agendapoint;
               besluit:openbaar ?isPublic.
          ?uri ext:hasDocumentContainer ?container.
          ?container pav:hasCurrentVersion ?editorDocument.
          ?editorDocument <http://mu.semte.ch/vocabularies/core/uuid> ?editorDocumentUuid.
          OPTIONAL {
            ?agendapoint besluit:aangebrachtNa ?earlierAgendapoint.
            ?executedAfter dct:subject ?earlierAgendapoint.
          }
          OPTIONAL {
            ?uri besluit:heeftVoorzitter ?chairman.
          }
          OPTIONAL {
            ?uri besluit:heeftSecretaris ?secretary.
          }
      } ORDER BY ASC(?position)
   `;
    const result = await query(queryString);
    if (result.results.bindings.length === 0) {
      console.warn(`no treatment of agendapoints found for meeting with uuid ${meetingUuid}`);
      return [];
    }
    else {
      const treatments = result.results.bindings.map((binding) => Treatment.fromBinding(binding));
      await Promise.all(treatments.map((treatment) => treatment.getAttachments()));
      return treatments.sort((a, b) => Number(a.position) > Number(b.position) ? 1 : -1);
    }
  }

  static async find(treatmentUuid) {
    const queryString = `
     ${prefixMap.get("besluit").toSparqlString()}
     ${prefixMap.get("dct").toSparqlString()}
     ${prefixMap.get("schema").toSparqlString()}
     ${prefixMap.get("mu").toSparqlString()}
     ${prefixMap.get("skos").toSparqlString()}
     ${prefixMap.get("ext").toSparqlString()}
     ${prefixMap.get("pav").toSparqlString()}
      SELECT * WHERE {
       BIND(${sparqlEscapeString(treatmentUuid)} as ?uuid)
       ?meeting a besluit:Zitting;
                   besluit:behandelt ?agendapoint.
          ?agendapoint schema:position ?position.
      ?uri a besluit:BehandelingVanAgendapunt;
           mu:uuid ?uuid;
           dct:subject ?agendapoint;
           besluit:openbaar ?isPublic;
           ext:hasDocumentContainer ?container.
      ?container pav:hasCurrentVersion ?editorDocument.
      ?editorDocument <http://mu.semte.ch/vocabularies/core/uuid> ?editorDocumentUuid.
    OPTIONAL {
        ?uri besluit:gebeurtNa ?executedAfter.
    }
    OPTIONAL {
        ?uri besluit:heeftVoorzitter ?chairman.
    }
    OPTIONAL {
        ?uri besluit:heeftSecretaris ?secretary.
    }
   }
   `;
    try {
      const result = await query(queryString);
      if (result.results.bindings.length === 1) {
        const treatment = Treatment.fromBinding(result.results.bindings[0]);
        await treatment.getAttachments();
        return treatment;
      }
      else {
        throw `did not find treatment with uuid ${treatmentUuid}`;
      }
    }
    catch(e) {
      console.error(e);
      throw `failed to retrieve treatment with uuid ${treatmentUuid}`;
    }
  }

  static fromBinding({
    uuid,
    uri,
    agendapoint,
    position,
    isPublic,
    meeting,
    container,
    editorDocumentUuid,
    executedAfter = null,
    chairman = null,
    secretary = null
  }) {
    return new Treatment({
      uuid: uuid.value,
      uri: uri.value,
      agendapoint : agendapoint.value,
      position : position.value,
      isPublic : isPublic.value === "true",
      meeting : meeting.value,
      documentContainerUri: container?.value,
      editorDocumentUuid : editorDocumentUuid.value,
      executedAfter : executedAfter?.value,
      chairman : chairman?.value,
      secretary : secretary?.value,
    });
  }

  constructor({
    uuid,
    uri,
    agendapoint,
    position,
    isPublic,
    meeting,
    documentContainerUri,
    editorDocumentUuid,
    executedAfter = null,
    chairman = null,
    secretary = null
  }) {
    this.uuid = uuid;
    this.uri = uri;
    this.agendapoint = agendapoint;
    this.position = position;
    this.isPublic = isPublic;
    this.meeting = meeting;
    this.editorDocumentUuid = editorDocumentUuid;
    this.executedAfter = executedAfter;
    this.chairman = chairman;
    this.secretary = secretary;
    this.documentContainerUri = documentContainerUri;
  }
  async getAttachments() {
    const queryString = `
      ${prefixMap.get("ext").toSparqlString()}
      ${prefixMap.get("dct").toSparqlString()}
      ${prefixMap.get("mu").toSparqlString()}
      ${prefixMap.get("nfo").toSparqlString()}
      SELECT * WHERE {
        ${sparqlEscapeUri(this.documentContainerUri)} ext:hasAttachments ?uri.
        ?uri dct:isPartOf ?decision;
          ext:hasFile ?file.
        ?file nfo:fileName ?filename;
          mu:uuid ?fileUuid.
        OPTIONAL {
          ?uri ext:attachmentType ?type.
        }
      }
    `;
    try {
      const result = await query(queryString);
      const attachments = result.results.bindings.map(Attachment.fromBinding);
      this.attachments = attachments;
    } catch(e) {
      console.error(e);
      throw `failed to retrieve attachments from treatment with uuid ${this.uuid}`;
    }
  }

}
