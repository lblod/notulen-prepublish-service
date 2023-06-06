import { prefixMap } from '../support/prefixes';
// @ts-ignore
import { query, sparqlEscapeString } from 'mu';

export default class Concept {
  static async find(uuid) {
    const queryString = `
      ${prefixMap.get('mu').toSparqlString()}
      ${prefixMap.get('skos').toSparqlString()}
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

  constructor({ uri, label }) {
    this.uri = uri.value;
    this.label = label.value;
  }
}
