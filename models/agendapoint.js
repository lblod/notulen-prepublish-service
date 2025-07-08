// @ts-strict-ignore

import { query, sparqlEscapeString, sparqlEscapeUri } from 'mu';
/** @import { BindingObject, SparqlResponse } from 'mu' */
import AppError from '../support/error-utils.js';
import { prefixMap } from '../support/prefixes.js';

export default class AgendaPoint {
  static async findAll({ meetingUuid }) {
    const queryString = `
     ${prefixMap['besluit'].toSparqlString()}
     ${prefixMap['dct'].toSparqlString()}
     ${prefixMap['schema'].toSparqlString()}
     ${prefixMap['mu'].toSparqlString()}
     ${prefixMap['skos'].toSparqlString()}
      SELECT * WHERE {
          ?meeting a besluit:Zitting;
                   mu:uuid ${sparqlEscapeString(meetingUuid)};
                   besluit:behandelt ?uri.
          ?uri besluit:geplandOpenbaar ?plannedPublic.
          ?uri dct:title ?title.
          ?uri schema:position ?position.
          OPTIONAL {
            ?uri besluit:aangebrachtNa ?addedAfter.
          }
          OPTIONAL {
            ?uri dct:description ?description.
          }
          OPTIONAL {
            ?uri <http://data.vlaanderen.be/ns/besluit#Agendapunt.type> ?type.
            ?type skos:prefLabel ?typeName.
         }
      }
   `;
    /** @type {SparqlResponse<ApData>} */
    // @ts-ignore Couldn't find a good way to do generic function calls
    const result = await query(queryString);
    if (result.results.bindings.length === 0) {
      console.warn(
        `no agendapoints found for meeting with uuid ${meetingUuid}`
      );
      return [];
    } else {
      const agendapoints = result.results.bindings.map((binding) =>
        AgendaPoint.fromBinding(binding)
      );
      return agendapoints.sort((a, b) =>
        Number(a.position) > Number(b.position) ? 1 : -1
      );
    }
  }

  /** @param {string} uri */
  static async findURI(uri) {
    const queryString = `
    ${prefixMap['besluit'].toSparqlString()}
    ${prefixMap['dct'].toSparqlString()}
    ${prefixMap['schema'].toSparqlString()}
    ${prefixMap['skos'].toSparqlString()}
    SELECT * WHERE {
        BIND(${sparqlEscapeUri(uri)} as ?uri)
        ?uri besluit:geplandOpenbaar ?plannedPublic.
        ?uri dct:title ?title.
        ?uri schema:position ?position.
        OPTIONAL {
            ?uri besluit:aangebrachtNa ?addedAfter.
        }
      OPTIONAL {
          ?uri dct:description ?description.
      }
      OPTIONAL {
          ?uri <http://data.vlaanderen.be/ns/besluit#Agendapunt.type> ?type.
          ?type skos:prefLabel ?typeName.
      }
    }`;
    /** @type {SparqlResponse<ApData>} */
    // @ts-ignore Couldn't find a good way to do generic function calls
    const result = await query(queryString);
    if (result.results.bindings.length === 1) {
      return AgendaPoint.fromBinding(result.results.bindings[0]);
    } else if (result.results.bindings.length > 1) {
      throw new AppError(
        500,
        `multiple agendapoints found for uri ${uri}`,
        true
      );
    } else {
      console.warn(`no agendapoint found for uri ${uri}`);
      return [];
    }
  }

  /** @param {BindingObject<ApData>} bound */
  static fromBinding({
    uri,
    title,
    position,
    plannedPublic,
    addedAfter = null,
    description = null,
    type = null,
    typeName = null,
  }) {
    return new AgendaPoint({
      uri: uri.value,
      title: title.value,
      position: position.value,
      plannedPublic: plannedPublic.value === 'true',
      addedAfter: addedAfter?.value,
      description: description?.value,
      type: type?.value,
      typeName: typeName?.value,
    });
  }

  /**
    @typedef {object} ApData
    @property {string} uri
    @property {string} title
    @property {string} position
    @property {boolean} plannedPublic
    @property {string | null} [addedAfter = null]
    @property {string | null} [description = null]
    @property {string | null} [type = null]
    @property {string | null} [typeName = null]
*/
  /** @param {ApData} args */
  constructor({
    uri,
    title,
    position,
    plannedPublic,
    addedAfter = null,
    description = null,
    type = null,
    typeName = null,
  }) {
    this.uri = uri;
    this.title = title;
    this.position = position;
    this.plannedPublic = plannedPublic;
    this.addedAfter = addedAfter;
    this.description = description;
    this.type = type;
    this.typeName = typeName;
  }
}
