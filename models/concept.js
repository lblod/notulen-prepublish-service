// @ts-strict-ignore

import { prefixMap } from '../support/prefixes';
import { query, sparqlEscapeString } from 'mu';

export default class Concept {
  /** @param {string} uuid */
  static async find(uuid) {
    const queryString = `
      ${prefixMap['mu'].toSparqlString()}
      ${prefixMap['skos'].toSparqlString()}
      SELECT ?uri ?label WHERE
      {
        ?uri a skos:Concept;
             mu:uuid ${sparqlEscapeString(uuid)};
             skos:prefLabel ?label.
      }
    `;
    const result = await query(queryString);
    if (result.results.bindings.length === 0) {
      throw `no concept found for uuid ${uuid}`;
    } else {
      return new Concept(result.results.bindings[0]);
    }
  }

  /** @param {import('mu').BindingObject} binding */
  constructor({ uri, label }) {
    this.uri = uri.value;
    this.label = label.value;
  }
}
