// @ts-ignore
import { update, sparqlEscapeUri, sparqlEscapeString, query } from 'mu';
import { prefixMap } from "./prefixes";
import { createHash } from 'crypto';

// Create a hash for the signed - or public resource based on:

// the full text content
// the uri of the person publishing/signing
// the created date of the resource

// currently uses sha-256
async function generateStringToHash(versionedUri, contentPredicate, sessionId, now) {
  now = now.toISOString();
  const queryString = `
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

  try {
    const result = await query(queryString);

    const stringToHash =
      // the full text content
      result.results.bindings[0].content.value +
      // the uri of the person publishing/signing
      result.results.bindings[0].userUri.value +
      // the created date of the resource
      now;

    return stringToHash;
  }
  catch (error) {
    throw new Error("unable to sign resource because couldn't find relavant data in the database");
  }
}

function generateHash(algorithm, stringToHash) {
  const hashClass = createHash(algorithm);
  hashClass.update(stringToHash);
  const hashString = hashClass.digest('hex');

  return hashString;
}

async function signDocument(newResourceUri, versionedUri, contentPredicate, sessionId, now, algorithm) {
  const stringToHash = await generateStringToHash(versionedUri, contentPredicate, sessionId, now);
  const hash = generateHash(algorithm, stringToHash);
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

    INSERT DATA{
      ${sparqlEscapeUri(newResourceUri)}
        sign:hashAlgorithm ${sparqlEscapeString(algorithm)};
        sign:hashValue ${sparqlEscapeString(hash)}.
    }
  `;

  try {
    await update(query);
  }
  catch (error) {
    throw new Error("unable to sign resource because couldn't insert data into the database");
  }
}

export { signDocument };
