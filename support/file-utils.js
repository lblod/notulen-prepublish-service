// @ts-strict-ignore

import { stat, writeFile, readFile } from 'fs/promises';
import { uuid, update } from 'mu';
import { sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime } from 'mu';
import { prefixMap } from "../support/prefixes.js";
/**
 * reads a file from the shared drive and returns its content
 * @param {string} shareUri the uri of the file to read
 * @return string
 */
export async function getFileContentForUri(shareUri) {
  const path = shareUri.replace('share://', '/share/');
  const content = await readFile(path, 'utf8');
  return content;
}

/**
 * write contents to a file in the shared drive and return its path
 */
export async function persistContentToFile(content) {
  const fileId = uuid();
  const filename = `${fileId}.html`;
  const path = `/share/${filename}`;
  await writeFile(path, content, 'utf8');
  return { uuid: fileId, path, filename };
}

export async function writeFileMetadataToDb(metadata) {
  console.log(metadata);
  const logicalFileUuid = uuid();
  const logicalFileUri = `http://lblod.data.gift/files/${logicalFileUuid}`;
  const logicalFileName = metadata.filename;
  const fileStats = await stat(metadata.path);
  const fileSize = fileStats.size;
  const created = new Date();
  const physicalFilename = metadata.filename;
  const physicalFileUri = metadata.path.replace('/share/', 'share://');
  const fileQuery = `
    ${prefixMap['ext'].toSparqlString()}
    ${prefixMap['mu'].toSparqlString()}
    ${prefixMap['prov'].toSparqlString()}
    ${prefixMap['nie'].toSparqlString()}
    ${prefixMap['nfo'].toSparqlString()}
    ${prefixMap['dct'].toSparqlString()}
    ${prefixMap['dbpedia'].toSparqlString()}
   INSERT DATA {
         ${sparqlEscapeUri(logicalFileUri)} a nfo:FileDataObject;
                    nfo:fileName ${sparqlEscapeString(logicalFileName)};
                    mu:uuid ${sparqlEscapeString(logicalFileUuid)};
                    dct:format "text/html";
                    dbpedia:fileExtension "html";
                    nfo:fileSize ${fileSize};
                    dct:created ${sparqlEscapeDateTime(created)};
                    dct:modified ${sparqlEscapeDateTime(created)}.
         ${sparqlEscapeUri(physicalFileUri)} a nfo:FileDataObject;
                    nie:dataSource ${sparqlEscapeUri(logicalFileUri)};
                    nfo:fileName ${sparqlEscapeUri(physicalFilename)};
                    mu:uuid ${sparqlEscapeUri(metadata.uuid)};
                    nfo:fileSize ${fileSize};
                    dbpedia:fileExtension "html";
                    dct:created ${sparqlEscapeDateTime(created)};
                    dct:modified ${sparqlEscapeDateTime(created)}.
  }`;
  await update(fileQuery);
  return logicalFileUri;
}
