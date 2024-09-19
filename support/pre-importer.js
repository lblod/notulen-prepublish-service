// @ts-ignore
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
        ${prefixMap.get('nie').toSparqlString()}
        ${prefixMap.get('prov').toSparqlString()}
        ${prefixMap.get('ext').toSparqlString()}
        SELECT ?content ?physicalFileUri
        WHERE {
         OPTIONAL { ${sparqlEscapeUri(uri)} ${contentPredicate} ?content. }
         OPTIONAL { ${sparqlEscapeUri(
           uri
         )} prov:generated/^nie:dataSource ?physicalFileUri. }
        }`;
  const result = await query(contentQuery);
  if (result.results.bindings.length == 1) {
    const binding = result.results.bindings[0];
    if (binding.content) {
      return binding.content.value;
    } else if (binding.physicalFileUri) {
      const content = await getFileContentForUri(binding.physicalFileUri.value);
      return content;
    }
  }
  throw new Error('could not retrieve content');
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
    ${prefixMap.get('bv').toSparqlString()}
    ${prefixMap.get('ext').toSparqlString()}
    ${prefixMap.get('mu').toSparqlString()}
    ${prefixMap.get('pav').toSparqlString()}
    ${prefixMap.get('sign').toSparqlString()}
    ${prefixMap.get('publicationStatus').toSparqlString()}
    ${prefixMap.get('muSession').toSparqlString()}
    ${prefixMap.get('dct').toSparqlString()}
    ${prefixMap.get('foaf').toSparqlString()}
    ${prefixMap.get('prov').toSparqlString()}
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

export { hackedSparqlEscapeString, handleVersionedResource, cleanupTriples };
