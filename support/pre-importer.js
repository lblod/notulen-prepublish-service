// @ts-ignore
import {update, sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid} from  'mu';
import {prefixMap} from "./prefixes";
import {signDocument} from './sign-document';

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

async function handleVersionedResource( type, versionedUri, sessionId, targetStatus, customSignaturePredicate, customStatePredicate, customContentPredicate ) {
  const now = new Date();
  const newResourceUuid = uuid();
  const resourceType = type == 'signature' ? "sign:SignedResource" : "sign:PublishedResource";
  const newResourceUri = `http://data.lblod.info/${type == 'signature' ? "signed-resources" : "published-resources"}/${newResourceUuid}`;
  const statePredicate = customStatePredicate || "ext:stateString";
  const contentPredicate = customContentPredicate || "ext:content";
  // TODO: get correct signatorySecret from ACMIDM
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
        sign:text ?content;
        sign:signatory ?userUri;
        sign:signatoryRoles ?signatoryRole;
        dct:created ${sparqlEscapeDateTime(now)};
        sign:signatorySecret ?signatorySecret;
        sign:status publicationStatus:unpublished;
        ${customSignaturePredicate ? `${customSignaturePredicate} ${sparqlEscapeUri(versionedUri)};` : ''}
        dct:subject ${sparqlEscapeUri(versionedUri)}.
      ${sparqlEscapeUri(versionedUri)}
        ${statePredicate} ${sparqlEscapeString(targetStatus)}.
    } WHERE {
      ${sparqlEscapeUri(versionedUri)}
        ${contentPredicate} ?content.
      ${sparqlEscapeUri(sessionId)}
        muSession:account/^foaf:account ?userUri.
      ${sparqlEscapeUri(sessionId)}
        ext:sessionRole ?signatoryRole.
      BIND ("helloworldsecretbehere" AS ?signatorySecret)
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
