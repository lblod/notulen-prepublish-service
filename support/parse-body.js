import InvalidRequest from './invalid-request';

// basic utility function to extract attributes and relationships from a json:api request
// TODO: consider using actual library
//
export function parseBody(jsonBody) {
  if (typeof jsonBody !== "object" || typeof jsonBody.data !== "object") {
    throw new InvalidRequest("could not parse json body");
  }
  const relationships = {};
  const relationshipData = jsonBody.data.relationships;
  if (relationshipData) {
    for (const key of Object.keys(relationshipData)) {
      relationships[key] = relationshipData[key].data;
    }
  }
  return {
    attributes: jsonBody.data?.attributes,
    relationships
  };
}
