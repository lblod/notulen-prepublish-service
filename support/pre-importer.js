// @ts-ignore
import {update, sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid, query} from  'mu';
import {prefixMap} from "./prefixes";
import {createHash} from 'crypto';

function cleanupTriples(triples) {
  const cleantriples = {};
  for (const triple of triples) {
    const hash = JSON.stringify(triple);
    cleantriples[hash]=triple;
  }
  return Object.keys(cleantriples).map( (k) => cleantriples[k]);
}

function hackedSparqlEscapeString( string ) {
  return `""${sparqlEscapeString(string.replace(/\n/g, function(match) { return ''; }).replace(/\r/g, function(match) { return '';}))}""`;
};

// Create a hash for the signed - or public resource based on:

// the full text content
// the uri of the person publishing/signing
// the created date of the resource

// currently uses sha-256
async function generateHash(versionedUri, contentPredicate, sessionId, now){ 
  
  now=now.toISOString();
  
  const queryString=`
    ${prefixMap.get("muSession").toSparqlString()}
    ${prefixMap.get("bv").toSparqlString()}
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("mu").toSparqlString()}
    ${prefixMap.get("pav").toSparqlString()}
    ${prefixMap.get("sign").toSparqlString()}
    ${prefixMap.get("publicationStatus").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}

    SELECT DISTINCT ?content ?userUri WHERE{
      ${sparqlEscapeUri(versionedUri)}
        ${contentPredicate} ?content.
      ${sparqlEscapeUri(sessionId)}
        muSession:account/^foaf:account ?userUri.
    }
  `;
  
  try{
    const result = await query(queryString);

    const stringToHash=
      // the full text content
      result.results.bindings[0].content.value+
      // the uri of the person publishing/signing
      result.results.bindings[0].userUri.value+
      // the created date of the resource
      now;
    
    const hashClass = createHash('sha1');
    hashClass.update(stringToHash);
    const hashString=hashClass.digest('hex');
    
    return hashString;
  }
  catch(error){
    throw new Error("unable to sign resource because couldn't find relavant data in the database");
  }
}

async function handleVersionedResource( type, versionedUri, sessionId, targetStatus, customSignaturePredicate, customStatePredicate, customContentPredicate ) {
  const now=new Date();
  const newResourceUuid = uuid();
  const resourceType = type == 'signature' ? "sign:SignedResource" : "sign:PublishedResource";
  const newResourceUri = `http://data.lblod.info/${type == 'signature' ? "signed-resources" : "published-resources"}/${newResourceUuid}`;
  const statePredicate = customStatePredicate || "ext:stateString";
  const contentPredicate = customContentPredicate || "ext:content";
  const hash=await generateHash(versionedUri, contentPredicate, sessionId, now);
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
        foaf:sha1 ${sparqlEscapeString(hash)};
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
  return updatePromise;
};

export {
  hackedSparqlEscapeString,
  handleVersionedResource,
  cleanupTriples
};
