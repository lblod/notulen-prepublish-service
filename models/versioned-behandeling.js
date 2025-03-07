// @ts-strict-ignore

import { query, sparqlEscapeString, sparqlEscapeUri, update, uuid } from 'mu';
import { hackedSparqlEscapeString } from "../support/pre-importer.js";
import { prefixMap } from "../support/prefixes.js";

// using the english name here, but the model is in dutch
export default class VersionedExtract {
  static async find(uuid) {
    const queryString = `
       ${prefixMap['besluit'].toSparqlString()}
       ${prefixMap['dct'].toSparqlString()}
       ${prefixMap['schema'].toSparqlString()}
       ${prefixMap['mu'].toSparqlString()}
       ${prefixMap['skos'].toSparqlString()}
       ${prefixMap['ext'].toSparqlString()}
       ${prefixMap['pav'].toSparqlString()}
        SELECT * WHERE {
           BIND(${sparqlEscapeString(uuid)} as ?uuid)

            ?uri a ext:VersionedBehandeling ;
                mu:uuid ?uuid ;
                ext:behandeling ?treatment;
                ext:content ?html.
            OPTIONAL {
                ?uri ext:stateString ?state .
            }
            FILTER NOT EXISTS { ?uri ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean> }

        }
   `;
    try {
      const result = await query(queryString);
      const bindings = result.results.bindings;
      if (bindings.length > 0) {
        const binding = bindings[0];
        return new VersionedExtract({
          uri: binding.uri.value,
          html: binding.html.value,
          treatment: binding.treatment.value,
          state: binding.state?.value,
        });
      } else {
        throw `did not find versionedTreatment with uuid ${uuid}`;
      }
    } catch (e) {
      console.error(e);
      throw `failed to retrieve versionedTreatment with uuid ${uuid}`;
    }
  }

  static async query({ treatmentUuid }) {
    const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?uri ?html ?uuid ?treatment
      WHERE
      {
        ?uri a ext:VersionedBehandeling;
                  mu:uuid ?uuid;
                  ext:content ?html;
                  ext:behandeling ?treatment.
        ?treatment mu:uuid ${sparqlEscapeString(treatmentUuid)}.
        FILTER NOT EXISTS { ?uri ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean> }
      }
  `);
    const bindings = r.results.bindings;
    if (bindings.length > 0) {
      const binding = bindings[0];
      return new VersionedExtract({
        uri: binding.uri.value,
        html: binding.html.value,
        treatment: binding.treatment.value,
      });
    } else {
      return null;
    }
  }

  static async create({ treatment, meeting, html }) {
    const versionedExtractUuid = uuid();
    const versionedExtractUri = `http://data.lblod.info/prepublished-behandelingen/${versionedExtractUuid}`;
    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA {
        ${sparqlEscapeUri(versionedExtractUri)}
           a ext:VersionedBehandeling;
           ext:content ${hackedSparqlEscapeString(html)};
           mu:uuid ${sparqlEscapeString(versionedExtractUuid)};
           ext:behandeling ${sparqlEscapeUri(treatment.uri)};
           ext:deleted "false"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>.
        ${sparqlEscapeUri(
          meeting.uri
        )} ext:hasVersionedBehandeling ${sparqlEscapeUri(versionedExtractUri)}.
      }`);
    return new VersionedExtract({
      html,
      uri: versionedExtractUri,
      treatment: treatment.uri,
    });
  }

  constructor({ uri, html = null, treatment, state = null }) {
    this.uri = uri;
    this.html = html;
    this.treatment = treatment;
    this.state = state;
  }
}
