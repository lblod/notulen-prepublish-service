// @ts-strict-ignore

import { query, sparqlEscapeUri } from 'mu';
import { prefixMap } from './prefixes';
import Mandatee from '../models/mandatee';

export default class ParticipantCache {
  constructor() {
    this.map = new Map();
  }

  set(uri, data) {
    this.map.set(uri, data);
  }

  async get(uri) {
    const value = this.map.get(uri);
    if (value) {
      return value;
    } else {
      const queryData = await query(`
        ${prefixMap['besluit'].toSparqlString()}
        ${prefixMap['mandaat'].toSparqlString()}
        ${prefixMap['org'].toSparqlString()}
        ${prefixMap['skos'].toSparqlString()}
        ${prefixMap['foaf'].toSparqlString()}
        ${prefixMap['persoon'].toSparqlString()}
        SELECT DISTINCT * WHERE {
          ${sparqlEscapeUri(uri)} mandaat:isBestuurlijkeAliasVan ?personUri;
            org:holds ?positionUri.
          ?positionUri org:role ?roleUri.
          ?roleUri skos:prefLabel ?role.
          ?personUri foaf:familyName ?familyName.
          ?personUri persoon:gebruikteVoornaam ?name.
        }
      `);
      if (queryData.results.bindings.length === 1) {
        const mandatee = new Mandatee({
          ...queryData.results.bindings[0],
          mandatarisUri: { value: uri },
        });
        this.map.set(uri, mandatee);
        return mandatee;
      } else {
        throw `mandatee with uri ${uri} was not found in the database`;
      }
    }
  }
}
