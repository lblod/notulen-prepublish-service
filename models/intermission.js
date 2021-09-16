import { prefixMap } from "../support/prefixes";
// @ts-ignore
import { query, sparqlEscapeUri } from "mu";
import { DateTime } from 'luxon';
const dateFormat = process.env.DATE_FORMAT || 'dd/MM/yyyy HH:mm';

const POSITION_LABEL_MAP = {
  "before": "voor",
  "during": "tijdens",
  "after": "na"
};

export default class Intermission {
  static async findAll({ meetingUri }) {
    const result = await query(`
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("prov").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(meetingUri)} ext:hasIntermission ?uri.
      ?uri prov:startedAtTime ?startedAt.
      OPTIONAL{
        ?uri prov:endedAtTime ?endedAt.
      }
      OPTIONAL {
        ?uri rdfs:comment ?comment.
      }
      OPTIONAL {
        ?uri ext:agendaPosition ?agendaPosition.

        ?agendaPosition dct:related ?agendapointUri.
        ?agendaPosition ext:location ?agendaPositionConcept.

        ?agendaPositionConcept skos:prefLabel ?agendaPositionLabel.

        ?agendapointUri dct:title ?agendapointTitle.
      }
    }
  `);

    return result.results.bindings.map((binding) => Intermission.fromBinding(binding));
  }

  static fromBinding({
    uri,
    startedAt,
    endedAt = null,
    comment = null,
    agendapointTitle = null,
    agendaPosition = null,
    agendapointUri = null,
    agendaPositionLabel = null,
    agendaPositionConcept = null
  }) {
    return new Intermission({
      uri: uri.value,
      startedAt: startedAt.value,
      endedAt: endedAt?.value,
      comment: comment?.value,
      agendapointTitle: agendapointTitle?.value,
      agendaPosition: agendaPosition?.value,
      agendapointUri: agendapointUri?.value,
      agendaPositionLabel: agendaPositionLabel?.value,
      agendaPositionConcept: agendaPositionConcept?.value
    });
  }

  constructor({
    uri,
    startedAt,
    endedAt,
    comment = null,
    agendapointTitle = null,
    agendaPosition = null,
    agendapointUri = null,
    agendaPositionLabel = null,
    agendaPositionConcept = null
  }) {
    this.uri = uri;
    this.startedAt = startedAt;
    this.startedAtText = this.startedAt ? DateTime.fromISO(this.startedAt).toFormat(dateFormat) : "";
    this.endedAt = endedAt;
    this.endedAtText = this.endedAt ? DateTime.fromISO(this.endedAt).toFormat(dateFormat) : "";
    this.comment = comment;
    this.agendaPositionLabel = POSITION_LABEL_MAP[agendaPositionLabel];
    this.agendapointUri = agendapointUri;
    this.agendaPosition = agendaPosition;
    this.agendapointTitle = agendapointTitle;
    this.agendaPositionConcept = agendaPositionConcept;
  }
}

