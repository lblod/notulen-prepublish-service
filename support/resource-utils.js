// @ts-ignore
import { query, sparqlEscapeString, sparqlEscapeUri } from 'mu';

export async function getUri(uuid) {
  const queryResult = await query(
    `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT * WHERE {
       ?uri <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString(
         uuid
       )}
     }`
  );
  if (!queryResult.results.bindings.length)
    throw new Error('URI not found for supplied uuid' + uuid);
  return queryResult.results.bindings[0].uri.value;
}

export async function getUuid(uri) {
  const queryResult = await query(
    `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT * WHERE {
       ${sparqlEscapeUri(uri)} <http://mu.semte.ch/vocabularies/core/uuid> ?uuid
     }`
  );
  if (!queryResult.results.bindings.length)
    throw new Error('URI not found for supplied URI' + uri);
  return queryResult.results.bindings[0].uuid.value;
}
