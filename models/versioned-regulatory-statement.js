// @ts-ignore
import {uuid, query, sparqlEscapeString, update, sparqlEscapeUri} from "mu";
import { persistContentToFile, writeFileMetadataToDb, getFileContentForUri } from '../support/file-utils';
import { prefixMap } from '../support/prefixes';
// using the english name here, but the model is in dutch
export default class VersionedRegulatoryStatement {
  static async query({regulatoryStatementDocumentUri}) {
    const r = await query(`
      ${prefixMap.get('ext').toSparqlString()}
      ${prefixMap.get('mu').toSparqlString()}
      ${prefixMap.get('prov').toSparqlString()}
      ${prefixMap.get('nie').toSparqlString()}
      SELECT ?uri ?content ?fileUri
      WHERE
      {
        ?uri a ext:VersionedRegulatoryStatement;
                  mu:uuid ?uuid;
                  ext:reglementaireBijlage ${sparqlEscapeString(regulatoryStatementDocumentUri)}.
        OPTIONAL { ?uri ext:content ?content. }
        OPTIONAL { ?uri prov:generated/^nie:dataSource ?fileUri. }
      }
  `);
    const bindings = r.results.bindings;
    if (bindings.length > 0) {
      const binding = bindings[0];
      const fileUri = binding.fileUri?.value;
      let html;
      if (fileUri){
        html = await getFileContentForUri(fileUri);
      } else {
        html = binding.content?.value;
      }
      return new VersionedRegulatoryStatement({uri: binding.uri.value, html, regulatoryStatementDocument: regulatoryStatementDocumentUri});
    }
    else {
      return null;
    }
  }

  static async create({regulatoryStatementDocumentUri, versionedTreatmentUri, html}) {
    const versionedRegulatoryStatementUuid = uuid();
    const versionedRegulatoryStatementUri = `http://data.lblod.info/prepublished-regulatory-statements/${versionedRegulatoryStatementUuid}`;
    const fileInfo = await persistContentToFile(html);
    const logicalFileUri = await writeFileMetadataToDb(fileInfo);
    
    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA {
        ${sparqlEscapeUri(versionedRegulatoryStatementUri)}
           a ext:VersionedRegulatoryStatement;
           prov:generated ${sparqlEscapeUri(logicalFileUri)};
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
