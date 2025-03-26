// @ts-strict-ignore

import {
  update,
  sparqlEscapeUri,
  sparqlEscapeString,
  query,
} from 'mu/sparql.js';
import { prefixMap } from './prefixes.js';
import { createHash } from 'crypto';
import { getFileContentForUri } from './file-utils.js';

// Create a hash for the signed - or public resource based on:

// the full text content
// the uri of the person publishing/signing
// the created date of the resource

// currently uses sha-256
async function generateStringToHash(
  versionedUri,
  contentPredicate,
  sessionId,
  now
) {
  now = now.toISOString();
  const queryString = `
    ${prefixMap['muSession'].toSparqlString()}
    ${prefixMap['bv'].toSparqlString()}
    ${prefixMap['ext'].toSparqlString()}
    ${prefixMap['mu'].toSparqlString()}
    ${prefixMap['pav'].toSparqlString()}
    ${prefixMap['sign'].toSparqlString()}
    ${prefixMap['publicationStatus'].toSparqlString()}
    ${prefixMap['dct'].toSparqlString()}
    ${prefixMap['prov'].toSparqlString()}
    ${prefixMap['nie'].toSparqlString()}

    SELECT DISTINCT ?content ?physicalFileUri ?userUri WHERE{
      OPTIONAL { ${sparqlEscapeUri(
        versionedUri
      )} ${contentPredicate} ?content. }
      OPTIONAL { ${sparqlEscapeUri(
        versionedUri
      )} prov:generated/^nie:dataSource ?physicalFileUri. }
      ${sparqlEscapeUri(sessionId)}
        muSession:account/^foaf:account ?userUri.
    }
  `;

  try {
    const result = await query(queryString);

    const binding = result.results.bindings[0];
    let content;
    if (binding.content) {
      content = binding.content.value;
    } else {
      content = await getFileContentForUri(binding.physicalFileUri.value);
    }

    const stringToHash =
      // the full text content
      content +
      // the uri of the person publishing/signing
      result.results.bindings[0].userUri.value +
      // the created date of the resource
      now;

    return stringToHash;
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    throw new Error(
      "unable to sign resource because couldn't find relavant data in the database"
    );
  }
}

function generateHash(algorithm, stringToHash) {
  const hashClass = createHash(algorithm);
  hashClass.update(stringToHash);
  const hashString = hashClass.digest('hex');

  return hashString;
}

async function signDocument(
  newResourceUri,
  versionedUri,
  contentPredicate,
  sessionId,
  now,
  algorithm
) {
  const stringToHash = await generateStringToHash(
    versionedUri,
    contentPredicate,
    sessionId,
    now
  );
  const hash = generateHash(algorithm, stringToHash);
  const query = `
    ${prefixMap['bv'].toSparqlString()}
    ${prefixMap['ext'].toSparqlString()}
    ${prefixMap['mu'].toSparqlString()}
    ${prefixMap['pav'].toSparqlString()}
    ${prefixMap['sign'].toSparqlString()}
    ${prefixMap['publicationStatus'].toSparqlString()}
    ${prefixMap['muSession'].toSparqlString()}
    ${prefixMap['dct'].toSparqlString()}
    ${prefixMap['foaf'].toSparqlString()}

    INSERT DATA{
      ${sparqlEscapeUri(newResourceUri)}
        sign:hashAlgorithm ${sparqlEscapeString(algorithm)};
        sign:hashValue ${sparqlEscapeString(hash)}.
    }
  `;

  try {
    await update(query);
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    throw new Error(
      "unable to sign resource because couldn't insert data into the database"
    );
  }
}

export { signDocument };
