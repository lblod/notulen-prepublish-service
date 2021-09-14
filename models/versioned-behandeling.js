// @ts-ignore
import {uuid, query, sparqlEscapeString, update, sparqlEscapeUri} from "mu";
import { hackedSparqlEscapeString } from '../support/pre-importer';

// using the english name here, but the model is in dutch
export default class VersionedExtract {
  static async query({treatmentUuid}) {
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
      }
  `);
    const bindings = r.results.bindings;
    if (bindings.length > 0) {
      const binding = bindings[0];
      return new VersionedExtract({uri: binding.uri.value, html: binding.html.value, treatment: binding.treatment.value});
    }
    else {
      return null;
    }
  }

  static async create({treatment, meeting, html}) {
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
           ext:content ${hackedSparqlEscapeString( html )};
           mu:uuid ${sparqlEscapeString( versionedExtractUuid )};
           ext:behandeling ${sparqlEscapeUri(treatment.uri)}.
        ${sparqlEscapeUri(meeting.uri)} ext:hasVersionedBehandeling ${sparqlEscapeUri(versionedExtractUri)}.
      }`);
    return new VersionedExtract({html, uri: versionedExtractUri, treatment: treatment.uri});
  }

  constructor({uri, html = null, treatment}) {
    this.uri = uri;
    this.html = html;
    this.treatment = treatment;
  }
}
