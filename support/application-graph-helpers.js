/**
 * Helpers which operate on the application graph.
 */

import { update, query,
         uuid,
         sparqlEscapeString, sparqlEscapeUri
       } from 'mu';


/**
 * Saves the node to the triplestore as the source of the supplied resource.
 *
 * @method saveNodeInTriplestore
 *
 * @param {DomNode} node Node to be saved
 * @param {string} resource Resource to which the content should be linked
 *
 * @return {Promise} Promise which yields true when the content was
 * saved successfully.
 */
function saveNodeInTriplestore( node, resource ) {
  const html = node.outerHTML;
  const escapedHtml = sparqlEscapeString( html );

  // We've put two quotes around escapedHtml to make the escapedHtml happy.  We can probably do better in the template.
  return update( `PREFIX pav: <http://purl.org/pav/>
INSERT DATA { GRAPH <http://mu.semte.ch/application> { <${resource}> pav:derivedFrom ""${escapedHtml}"". } }` );
}

/**
 * Ensures all resources in the temporary graph with the supplied
 *  types have a UUID in the shared mu.semte.ch graph.
 *
 * @method ensureGlobalUuidsForTypes
 *
 * @param {string} graphName Name of the graph in which we'll search
 * for the resources.
 * @param {[string]} types Full string uri of all types which should
 * receive the uuid treatment.
 *
 * @return {Promise} promise which resolves when the operation has
 * finished.
 */
function ensureGlobalUuidsForTypes( graphName, types ){
  return query(
    `SELECT ?subject WHERE {
       GRAPH ${sparqlEscapeUri( graphName )} {
         ?subject a ?type
         VALUES ?type {
           ${ types.map( sparqlEscapeUri ).join( " " ) }
         }
       }
     }`).then( (response) => {
       const promiseArr =
             response.results.bindings.map( ({subject}) => {
               const query = `
                 INSERT {
                   GRAPH <http://mu.semte.ch/application> {
                     ?s <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString( uuid() )}.
                   }
                 } WHERE {
                   FILTER NOT EXISTS {
                    ?s <http://mu.semte.ch/vocabularies/core/uuid> ?uuid
                   }
                   VALUES ?s { ${sparqlEscapeUri(subject.value)} }
                 }`;
               return update(query); } );
       return Promise.all( promiseArr );
     } );
}

export { ensureGlobalUuidsForTypes };

