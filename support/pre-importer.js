// @ts-ignore
import {query, update, sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid} from  'mu';
import {prefixMap} from "./prefixes";
import {signDocument} from './sign-document';
import { getFileContentForUri, persistContentToFile, writeFileMetadataToDb } from './file-utils';

function cleanupTriples(triples) {
  const cleantriples = {};
  for (const triple of triples) {
    const hash = JSON.stringify(triple);
    cleantriples[hash]=triple;
  }
  return Object.keys(cleantriples).map( (k) => cleantriples[k]);
}

function hackedSparqlEscapeString( string ) {
  return `${sparqlEscapeString(string.replace(/\n/g, function() { return ''; }).replace(/\r/g, function() { return '';}))}`;
}

async function getVersionedContent(uri, contentPredicate) {
  const result = await query(`
        ${prefixMap.get("prov").toSparqlString()}
        ${prefixMap.get("ext").toSparqlString()}
        SELECT ?content ?fysicalFileUri
        WHERE {
         OPTIONAL { ${sparqlEscapeUri(uri)} ${contentPredicate} ?content. }
         OPTIONAL { ${sparqlEscapeUri(uri)} prov:generated/^nie:dataSource ?fysicalFileUri. }
        }`);
  if (result.results.bindings.length == 1) {
    const binding = result.results.bindings[0];
    if (binding.content) {
      return binding.content.value;
    }
    else {
      const content = await getFileContentForUri(binding.fysicalFileUri.value);
      return content;
    }
  }
  else {
    throw "could not retrieve content";
  }
}

async function handleVersionedResource( type, versionedUri, sessionId, targetStatus, customSignaturePredicate, customStatePredicate, customContentPredicate, attachments ) {
  const now = new Date();
  const newResourceUuid = uuid();
  const resourceType = type == 'signature' ? "sign:SignedResource" : "sign:PublishedResource";
  const newResourceUri = `http://data.lblod.info/${type == 'signature' ? "signed-resources" : "published-resources"}/${newResourceUuid}`;
  const statePredicate = customStatePredicate || "ext:stateString";
  const contentPredicate = customContentPredicate || "ext:content";
  const attachmentsString = attachments ? attachments.map((attachment) => `${sparqlEscapeUri(newResourceUri)} ext:hasAttachments ${sparqlEscapeUri(attachment.uri)}.`).join(' ') : '';
  const content = await getVersionedContent(versionedUri, contentPredicate);
  const query = `
    ${prefixMap.get("bv").toSparqlString()}
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("mu").toSparqlString()}
    ${prefixMap.get("pav").toSparqlString()}
    ${prefixMap.get("sign").toSparqlString()}
    ${prefixMap.get("publicationStatus").toSparqlString()}
    ${prefixMap.get("muSession").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}

    DELETE {
      ${sparqlEscapeUri(versionedUri)}
        ${statePredicate} ?state.
    } INSERT {
      ${sparqlEscapeUri(newResourceUri)}
        a ${resourceType};
        mu:uuid ${sparqlEscapeString(newResourceUuid)};
        sign:text ${sparqlEscapeString(content)};
        sign:signatory ?userUri;
        sign:signatoryRoles ?signatoryRole;
        dct:created ${sparqlEscapeDateTime(now)};
        sign:status publicationStatus:unpublished;
        ${customSignaturePredicate ? `${customSignaturePredicate} ${sparqlEscapeUri(versionedUri)};` : ''}
        dct:subject ${sparqlEscapeUri(versionedUri)}.
      ${sparqlEscapeUri(versionedUri)}
        ${statePredicate} ${sparqlEscapeString(targetStatus)}.
      ${attachmentsString}
    } WHERE {
      ${sparqlEscapeUri(sessionId)}
        muSession:account/^foaf:account ?userUri.
      ${sparqlEscapeUri(sessionId)}
        ext:sessionRole ?signatoryRole.
    }`;
  const updatePromise = await update( query );
  await signDocument(newResourceUri, versionedUri, contentPredicate, sessionId, now, 'sha256');
  return updatePromise;
}

export {
  hackedSparqlEscapeString,
  handleVersionedResource,
  cleanupTriples
};
