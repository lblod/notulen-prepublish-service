import InvalidRequest from './invalid-request';

/**
 * @typedef {Object} Relationship
 * @property {unknown} data
 */
/**
 * basic utility function to extract attributes and relationships from a json:api request
 * TODO: consider using actual library
 * @param {Object} jsonBody
 * @param {Object} jsonBody.data
 * @param {Record<string, Array<Relationship> | Relationship>} jsonBody.data.relationships
 * @param {Object} jsonBody.data.attributes
 */
export function parseBody(jsonBody) {
  if (typeof jsonBody !== 'object' || typeof jsonBody.data !== 'object') {
    throw new InvalidRequest('could not parse json body');
  }
  /** @type {Record<string, unknown>} */
  const relationships = {};
  const relationshipData = jsonBody.data.relationships;
  if (relationshipData) {
    for (const key of Object.keys(relationshipData)) {
      const relationship = relationshipData[key];
      if (Array.isArray(relationship)) {
        relationships[key] = relationship.map(
          (relationship) => relationship.data
        );
      } else {
        relationships[key] = relationship.data;
      }
    }
  }
  return {
    attributes: jsonBody.data?.attributes,
    relationships,
  };
}
