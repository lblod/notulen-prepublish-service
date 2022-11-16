// @ts-ignore
import {uuid, query, sparqlEscapeString, update, sparqlEscapeUri} from "mu";
import { hackedSparqlEscapeString } from '../support/pre-importer';

// using the english name here, but the model is in dutch
export default class VersionedRegulatoryStatement {
  static async query({regulatoryStatementDocumentUri}) {
    const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?uri ?html ?uuid ?regulatoryStatement
      WHERE
      {
        ?uri a ext:VersionedRegulatoryStatement;
                  mu:uuid ?uuid;
                  ext:content ?html;
                  ext:reglementaireBijlage ${sparqlEscapeString(regulatoryStatementDocumentUri)}.
      }
  `);
    const bindings = r.results.bindings;
    if (bindings.length > 0) {
      const binding = bindings[0];
      return new VersionedRegulatoryStatement({uri: binding.uri.value, html: binding.html.value, regulatoryStatementDocument: regulatoryStatementDocumentUri});
    }
    else {
      return null;
    }
  }

  static async create({regulatoryStatementDocumentUri, versionedTreatmentUri, html}) {
    const versionedRegulatoryStatementUuid = uuid();
    const versionedRegulatoryStatementUri = `http://data.lblod.info/prepublished-regulatory-statements/${versionedRegulatoryStatementUuid}`;
    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA {
        ${sparqlEscapeUri(versionedRegulatoryStatementUri)}
           a ext:VersionedRegulatoryStatement;
           ext:content ${hackedSparqlEscapeString( html )};
           mu:uuid ${sparqlEscapeString( versionedRegulatoryStatementUuid )};
           ext:regulatoryStatement ${sparqlEscapeUri(regulatoryStatementDocumentUri)}.
        ${sparqlEscapeUri(versionedTreatmentUri)} ext:hasVersionedReglementaireBijlage ${sparqlEscapeUri(versionedRegulatoryStatementUri)}.
      }`);
    return new VersionedRegulatoryStatement({html, uri: versionedRegulatoryStatementUri, regulatoryStatementDocument: regulatoryStatementDocumentUri});
  }

  constructor({uri, html = null, regulatoryStatementDocument}) {
    this.uri = uri;
    this.html = html;
    this.regulatoryStatementDocument = regulatoryStatementDocument;
  }
}
