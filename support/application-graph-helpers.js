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
async function saveNodeInTriplestore( node, resource ) {
  const html = node.outerHTML;
  const escapedHtml = sparqlEscapeString( html );

  // We've put two quotes around escapedHtml to make the escapedHtml happy.  We can probably do better in the template.
  await update( `PREFIX pav: <http://purl.org/pav/>
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
async function ensureGlobalUuidsForTypes( graphName, types ){
  const response = await query(
    `SELECT ?subject WHERE {
       GRAPH ${sparqlEscapeUri( graphName )} {
         ?subject a ?type
         VALUES ?type {
           ${ types.map( sparqlEscapeUri ).join( " " ) }
         }
       }
     }`);

  await Promise.all(
    response.results.bindings.map( async function({subject}){
      await update(
        `INSERT {
           GRAPH <http://mu.semte.ch/application> {
             ?s <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString( uuid() )}.
           }
         } WHERE {
           FILTER NOT EXISTS {
            ?s <http://mu.semte.ch/vocabularies/core/uuid> ?uuid
           }
           VALUES ?s { ${sparqlEscapeUri(subject.value)} }
         }`);
    }) );
}

/**
 * Inserts the result of a bunch of queries into the triplestore by
 * taking a union from their contents in the supplied sourceGraph.
 * The results are inserted into the main graph.  UNIONS are expected
 * to use ?s ?p ?o to construct their contents.
 *
 * @method insertUnionOfQueries
 * 
 * @param {string} prefix Prefixes to be inserted before the queries
 * @param {string} sourceGraph URI of the graph from which content
 * should be selected
 * @param {[string]} queries Queries which are bound to the
 * sourceGraph and which return ?s ?p ?o for content to be returned
 * @param {boolean} splitCalls Optional, when truethy, calls will be
 * split so the target graph can be analysed between each call (add a
 * breakpoint in the node debugger for this to work)
 *
 * @return {Promise} Succeeds when all content is inserted.
 */

async function insertUnionOfQueries( { prefix, sourceGraph, queries, splitCalls } ){
  if( splitCalls ){
    console.log( `Executing multiple queries on ${sourceGraph}` );
    for( var i = 0 ; i < queries.length ; i++ ) {
      let currentQuery = queries[i];
      console.log( `Running import of ${sourceGraph}, being ====== ${currentQuery} ======` );
      await update(
        `${prefix}
         INSERT {
           GRAPH <http://mu.semte.ch/application> {
             ?s ?p ?o.
           }
         } WHERE {
           GRAPH ${sparqlEscapeUri( sourceGraph )} {
             ${currentQuery}
           }
         }`);
    }
    console.log( `Finished executing queries on ${sourceGraph}` );
  } else {
    await update(
      `${prefix}
       INSERT {
         GRAPH <http://mu.semte.ch/application> {
           ?s ?p ?o.
         }
       } WHERE {
         GRAPH ${sparqlEscapeUri( sourceGraph )} {
           { ${queries.join( ' } UNION { ' )} }
         }
       }`);
  }
}


export { ensureGlobalUuidsForTypes, insertUnionOfQueries };
