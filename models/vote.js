import { prefixMap } from '../support/prefixes';
import { sparqlEscapeUri, query } from 'mu';

export default class Vote {
  static async findAll({treatment}) {
    const result = await query(`
       ${prefixMap.get("besluit").toSparqlString()}
       SELECT DISTINCT * WHERE {
         ${sparqlEscapeUri(treatment)} besluit:heeftStemming ?uri.
         OPTIONAL { ?uri besluit:onderwerp ?subject }
         OPTIONAL { ?uri besluit:gevolg ?result. }
      }
  `);
    return result.results.bindings.map((binding) => Vote.fromBinding(binding));
  }

  static fromBinding({uri, subject, result}) {
    return new Vote({
      uri: uri.value,
      subject: subject?.value,
      result: result?.value
    });
  }

  constructor({uri, subject = null, result = null}) {
    this.uri = uri;
    this.subject = subject;
    this.result = result;
  }
}
