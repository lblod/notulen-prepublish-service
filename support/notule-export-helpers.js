import { update } from 'mu';

/**
 * This file contains helpers for exporting content from the notule.
 */

/**
 * Imports the Agenda into the main graph
 *
 * @method importAgenda
 * 
 * @param {string} tempGraph Name of the graph from which the contents
 * should be read.
 *
 * @return {Promise} Yields positive when the content has been saved
 * to the main triplestore.
 */
function importAgenda( tempGraph ){
  console.log( `Importing agenda from ${tempGraph}` );
  return update( `INSERT { GRAPH <http://mu.semte.ch/application> { ?s ?p ?o. } }
                  WHERE {
                    GRAPH <${tempGraph}> {
                      {
                        ?s a <http://data.vlaanderen.be/ns/besluit#Zitting>.
                        ?s ?p ?o.
                        VALUES ?p { <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://data.vlaanderen.be/ns/besluit#behandelt> }
                      }
                      UNION 
                      {
                        ?ss a <http://data.vlaanderen.be/ns/besluit#Zitting>.
                        ?ss <http://data.vlaanderen.be/ns/besluit#behandelt> ?s.
                        ?s ?p ?o.
                        VALUES ?p {
                          <http://purl.org/dc/terms/title>
                          <http://data.vlaanderen.be/ns/besluit#geplandOpenbaar>
                          <http://data.vlaanderen.be/ns/besluit#AgendaPunt.type>
                          <http://purl.org/dc/terms/description>
                        }
                      }
                    } 
                  }` );
}

export { importAgenda };
