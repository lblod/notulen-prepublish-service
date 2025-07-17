// @ts-strict-ignore

import {
  query,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
  uuid,
} from 'mu';
import { prefixMap } from './prefixes';
import { signDocument } from './sign-document';
import {
  getFileContentForUri,
  persistContentToFile,
  writeFileMetadataToDb,
} from './file-utils';

function cleanupTriples(triples) {
  const cleantriples = {};
  for (const triple of triples) {
    const hash = JSON.stringify(triple);
    cleantriples[hash] = triple;
  }
  return Object.keys(cleantriples).map((k) => cleantriples[k]);
}

function hackedSparqlEscapeString(string, optimizeSpaces = false) {
  let result = `${sparqlEscapeString(
    string
      .replace(/\n/g, function () {
        return '';
      })
      .replace(/\r/g, function () {
        return '';
      })
  )}`;
  if (optimizeSpaces) {
    console.log('OPTIMIZING SPACES');
    result = result.replace(/\s+/g, ' ');
  }
  return result;
}

async function getVersionedContent(uri, contentPredicate) {
  const contentQuery = `
        ${prefixMap['nie'].toSparqlString()}
        ${prefixMap['prov'].toSparqlString()}
        ${prefixMap['ext'].toSparqlString()}
        SELECT ?content ?physicalFileUri
        WHERE {
         OPTIONAL { ${sparqlEscapeUri(uri)} ${contentPredicate} ?content. }
         OPTIONAL { ${sparqlEscapeUri(
           uri
         )} prov:generated/^nie:dataSource ?physicalFileUri. }
        }`;
  const result = await query(contentQuery);
  const bindings = result.results.bindings;
  if (bindings.length === 1) {
    const binding = bindings[0];
    if (binding.physicalFileUri) {
      const content = await getFileContentForUri(binding.physicalFileUri.value);
      return content;
    } else if (binding.content) {
      return binding.content.value;
    }
  } else if (bindings.length > 1) {
    throw new Error(
      `Found ${bindings.length} sources of content for versioned resource ${uri}. Only one is allowed. This means there is invalid data in the database.`
    );
  } else {
    throw new Error(
      `Found no sources of content for versioned resource ${uri}`
    );
  }
}

async function handleVersionedResource(
  type,
  versionedUri,
  sessionId,
  targetStatus,
  customSignaturePredicate,
  customStatePredicate,
  customContentPredicate,
  attachments
) {
  if (type === 'signature') {
    const isValidSignature = await checkValidSignature(versionedUri, sessionId);
    if (!isValidSignature)
      throw new Error(
        `The resource with uri ${versionedUri} cannot be signed by ${sessionId}`
      );
  } else {
    const isValidPublication = await checkValidPublication(versionedUri);
    if (!isValidPublication)
      throw new Error(
        `The resource with uri ${versionedUri} cannot be publised as it has been published before`
      );
  }
  const now = new Date();
  const newResourceUuid = uuid();
  const resourceType =
    type == 'signature' ? 'sign:SignedResource' : 'sign:PublishedResource';
  const newResourceUri = `http://data.lblod.info/${
    type == 'signature' ? 'signed-resources' : 'published-resources'
  }/${newResourceUuid}`;
  const statePredicate = customStatePredicate || 'ext:stateString';
  const contentPredicate = customContentPredicate || 'ext:content';
  const attachmentsString = attachments
    ? attachments
        .map(
          (attachment) =>
            `${sparqlEscapeUri(
              newResourceUri
            )} ext:hasAttachments ${sparqlEscapeUri(attachment.uri)}.`
        )
        .join(' ')
    : '';
  const content = await getVersionedContent(versionedUri, contentPredicate);
  // This creates a new file each time, even if getVersionedContent has just retrieved it from a
  // file. This is to make handling deletes and document changes easier.
  const fileMetadata = await persistContentToFile(content);
  const logicalFileUri = await writeFileMetadataToDb(fileMetadata);

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
    ${prefixMap['prov'].toSparqlString()}
    DELETE {
      ${sparqlEscapeUri(versionedUri)}
        ${statePredicate} ?state.
    } INSERT {
      ${sparqlEscapeUri(newResourceUri)}
        a ${resourceType};
        mu:uuid ${sparqlEscapeString(newResourceUuid)};
        prov:generated ${sparqlEscapeUri(logicalFileUri)};
        sign:signatory ?userUri;
        sign:signatoryRoles ?signatoryRole;
        dct:created ${sparqlEscapeDateTime(now)};
        sign:status publicationStatus:unpublished;
        ${
          customSignaturePredicate
            ? `${customSignaturePredicate} ${sparqlEscapeUri(versionedUri)};`
            : ''
        }
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
  await update(query);
  await signDocument(
    newResourceUri,
    versionedUri,
    contentPredicate,
    sessionId,
    now,
    'sha256'
  );
  return newResourceUri;
}

async function checkValidSignature(versionedUri, sessionId) {
  const validationQuery = `
  ${prefixMap['dct'].toSparqlString()}
   ${prefixMap['sign'].toSparqlString()}
   ${prefixMap['muSession'].toSparqlString()}
   ${prefixMap['foaf'].toSparqlString()}
   ${prefixMap['ext'].toSparqlString()}
    SELECT ?invalid WHERE {
      OPTIONAL {
        ?a a sign:SignedResource;
          dct:subject ${sparqlEscapeUri(versionedUri)}.
        ?b a sign:SignedResource;
          dct:subject ${sparqlEscapeUri(versionedUri)}.
        FILTER(?a != ?b)
        FILTER NOT EXISTS {
          ?a ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>.
        }
        FILTER NOT EXISTS {
          ?b ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>.
        }
      }
      OPTIONAL {
        ?c a sign:SignedResource; 
           dct:subject ${sparqlEscapeUri(versionedUri)};
          sign:signatory ?userUri.
        FILTER NOT EXISTS {
          ?c ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>.
        }
      }
      BIND( BOUND(?a) || BOUND(?c) AS ?invalid)
      ${sparqlEscapeUri(sessionId)} muSession:account/^foaf:account ?userUri.
    }
  `;
  const queryResult = await query(validationQuery);
  return queryResult.results.bindings[0]?.invalid.value !== '1';
}

async function checkValidPublication(versionedUri) {
  const validationQuery = `
  ${prefixMap['dct'].toSparqlString()}
   ${prefixMap['sign'].toSparqlString()}
   ${prefixMap['muSession'].toSparqlString()}
   ${prefixMap['foaf'].toSparqlString()}
   ${prefixMap['ext'].toSparqlString()}
    SELECT ?invalid WHERE {
      OPTIONAL {
        ?a a sign:PublishedResource;
          dct:subject ${sparqlEscapeUri(versionedUri)}.
        FILTER NOT EXISTS {
          ?a ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>.
        }
      }
      BIND( BOUND(?a) AS ?invalid)
    }
  `;
  const queryResult = await query(validationQuery);
  return queryResult.results.bindings[0]?.invalid.value !== '1';
}

export { hackedSparqlEscapeString, handleVersionedResource, cleanupTriples };
