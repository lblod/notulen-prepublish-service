// @ts-strict-ignore

import { prefixMap } from '../support/prefixes.js';
import { DateTime } from 'luxon';
import { query, sparqlEscapeString, sparqlEscapeUri } from 'mu/sparql.js';
/** @import { BindingObject } from 'mu/sparql.js' */
import validateMeeting from '../support/validate-meeting.js';
import { articlesBasedOnClassifcationMap } from '../support/classification-utils.js';
import AppError from '../support/error-utils.js';

const dateFormat = process.env.DATE_FORMAT || 'dd/MM/yyyy HH:mm';

export default class Meeting {
  constructor({
    uuid,
    uri,
    adminBodyName = null,
    adminBodyUri = null,
    startedAt = null,
    endedAt = null,
    plannedStart = null,
    intro = null,
    outro = null,
    location = null,
    adminBodyClassification = null,
    optimizeSpaces = false,
  }) {
    this.uuid = uuid;
    this.uri = uri;
    this.adminBodyUri = adminBodyUri;
    this.adminBodyName = adminBodyName;
    this.adminBodyArticle = this.generateAdminBodyArticle(
      adminBodyClassification
    );
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.plannedStart = plannedStart;
    this.startedAtText = this.startedAt
      ? DateTime.fromISO(this.startedAt).toFormat(dateFormat)
      : '';
    this.endedAtText = this.endedAt
      ? DateTime.fromISO(this.endedAt).toFormat(dateFormat)
      : '';
    this.plannedStartText = this.plannedStart
      ? DateTime.fromISO(this.plannedStart).toFormat(dateFormat)
      : '';
    this.intro = intro;
    this.outro = outro;
    this.location = location;
    // this is a hack for very large meetings. We can add this triple, and then this service
    // will aggressively collapse spaces down to a single space. This can shave off just enough
    // characters to make a meeting go through the pipeline which otherwise wouldn't.
    // use with extreme caution
    this.optimizeSpaces = optimizeSpaces;
  }

  /** @param {string} uri */
  static async findURI(uri) {
    const queryString = `
    ${prefixMap['ext'].toSparqlString()}
    ${prefixMap['besluit'].toSparqlString()}
    ${prefixMap['prov'].toSparqlString()}
    ${prefixMap['mu'].toSparqlString()}
    ${prefixMap['skos'].toSparqlString()}
    ${prefixMap['mandaat'].toSparqlString()}
    ${prefixMap['notulen'].toSparqlString()}
    SELECT * WHERE {
      BIND(${sparqlEscapeUri(uri)} as ?uri)
      ?uri a besluit:Zitting;
        mu:uuid ?uuid;
        besluit:isGehoudenDoor ?adminBodyUri;
        besluit:geplandeStart ?plannedStart.
        ?adminBodyUri mandaat:isTijdspecialisatieVan ?mainBestuursorgaanUri.
        ?mainBestuursorgaanUri skos:prefLabel ?adminBodyName.
      OPTIONAL {
        ?uri prov:atLocation ?location.
      }
      OPTIONAL {
        ?uri prov:startedAtTime ?startedAt.
      }
      OPTIONAL {
        ?uri prov:endedAtTime ?endedAt.
      }
      OPTIONAL {
        ?uri notulen:intro ?intro.
      }
      OPTIONAL {
        ?uri notulen:outro ?outro.
      }
      OPTIONAL {
          ?uri ext:optimizeSpaces ?optimizeSpaces.
      }
    }`;
    const result = await query(queryString);
    if (result.results.bindings.length === 1) {
      return Meeting.fromBinding(result.results.bindings[0]);
    } else if (result.results.bindings.length > 1) {
      throw new AppError(
        500,
        `found ${result.results.bindings.length} meetings for uri ${uri}`,
        true
      );
    } else {
      throw new AppError(404, `found no meeting for uri ${uri}`, true);
    }
  }

  /** @param {string} uuid */
  static async find(uuid) {
    const queryString = `
    ${prefixMap['ext'].toSparqlString()}
    ${prefixMap['besluit'].toSparqlString()}
    ${prefixMap['prov'].toSparqlString()}
    ${prefixMap['mu'].toSparqlString()}
    ${prefixMap['skos'].toSparqlString()}
    ${prefixMap['mandaat'].toSparqlString()}
    ${prefixMap['notulen'].toSparqlString()}
    SELECT * WHERE {
      BIND(${sparqlEscapeString(uuid)} as ?uuid)
      ?uri a besluit:Zitting;
        besluit:isGehoudenDoor ?adminBodyUri;
        besluit:geplandeStart ?plannedStart;
        mu:uuid ?uuid.
      ?adminBodyUri mandaat:isTijdspecialisatieVan ?mainBestuursorgaanUri.
      ?mainBestuursorgaanUri skos:prefLabel ?adminBodyName.
      ?mainBestuursorgaanUri besluit:classificatie ?adminBodyClassification.
      OPTIONAL {
          ?uri prov:atLocation ?location.
      }
      OPTIONAL {
          ?uri prov:startedAtTime ?startedAt.
      }
      OPTIONAL {
          ?uri prov:endedAtTime ?endedAt.
      }
      OPTIONAL {
          ?uri notulen:intro ?intro.
      }
      OPTIONAL {
          ?uri notulen:outro ?outro.
      }
      OPTIONAL {
          ?uri ext:optimizeSpaces ?optimizeSpaces.
      }
    }`;
    const result = await query(queryString);
    if (result.results.bindings.length === 1) {
      return Meeting.fromBinding(result.results.bindings[0]);
    } else if (result.results.bindings.length > 1) {
      throw new AppError(
        500,
        `found ${result.results.bindings.length} meetings for id ${uuid}`,
        true
      );
    } else {
      throw new AppError(404, `found no meeting for id ${uuid}`, true);
    }
  }

  /** @param {BindingObject} binding */
  static fromBinding(binding) {
    return new Meeting({
      uuid: binding.uuid.value,
      uri: binding.uri.value,
      adminBodyUri: binding.adminBodyUri?.value,
      adminBodyName: binding.adminBodyName?.value,
      adminBodyClassification: binding.adminBodyClassification?.value,
      startedAt: binding.startedAt?.value,
      endedAt: binding.endedAt?.value,
      plannedStart: binding.plannedStart?.value,
      intro: binding.intro?.value,
      outro: binding.outro?.value,
      location: binding.location?.value,
      optimizeSpaces: binding.optimizeSpaces?.value === 'true',
    });
  }

  /** @param {string} adminBodyUri */
  generateAdminBodyArticle(adminBodyUri) {
    return articlesBasedOnClassifcationMap[adminBodyUri];
  }

  validate() {
    return validateMeeting(this);
  }
}
