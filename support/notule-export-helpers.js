import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';

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

/**
 * Imports the agenda in the tempGraph, which originates from the
 * supplied EditorDocument to the triplestore.
 *
 * @method importAgendaFromDoc
 *
 * @param {string} tempGraph Name of the graph from which the contents
 * originate.
 * @param {EditorDocument} doc Document from which the contents originated.
 * @param {DomNode} domNode Node which was used to import the contents
 * into the triplestore.
 *
 * @return {Promise} Yields positive when the content has been saved
 * to the main triplestore.
 */

function importAgendaFromDoc( tempGraph, doc, domNode ) {
  console.log( `Importing agenda from ${tempGraph}` );

  // make agenda resource
  // ensure output is written to pav:derivedFrom

  return update( `INSERT { GRAPH <http://mu.semte.ch/application> { ?s ?p ?o. } }
                  WHERE {
                     GRAPH <${tempGraph}> {
                       {
                         ?s a <http://data.vlaanderen.be/ns/besluit#Zitting>.
                         ?s ?p ?o.
                         VALUES ?p {
                           <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>
                           <http://data.vlaanderen.be/ns/besluit#heeftAgenda>
                         }
                       }
                       UNION {
                         ?ss a <http://data.vlaanderen.be/ns/besluit#Zitting>;
                             <http://data.vlaanderen.be/ns/besluit#heeftAgenda> ?s.
                         ?s ?p ?o.
                         VALUES ?p {
                           <http://data.vlaanderen.be/ns/besluit#heeftAgendapunt>
                           <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>
                         }
                       }
                       UNION
                       {
                         ?ss <http://data.vlaanderen.be/ns/besluit#heeftAgendapunt> ?s.
                         ?s ?p ?o.
                         VALUES ?p {
                           <http://purl.org/dc/terms/title>
                           <http://purl.org/dc/terms/description>
                           <http://data.vlaanderen.be/ns/besluit#geplandOpenbaar>
                           <http://data.vlaanderen.be/ns/besluit#AgendaPunt.type>
                         }
                       }
                       UNION
                       {
                         ?s a <http://data.vlaanderen.be/ns/besluit#Zitting>.
                         BIND ( <http://data.vlaanderen.be/ns/besluit#heeftNotulen> AS ?p )
                         BIND ( ${sparqlEscapeUri(doc.uri)} AS ?o )
                       }
                     }
                   }` );

  // we skipped the following
  //   UNION
  //   {
  //     ?ss <http://data.vlaanderen.be/ns/besluit#heeftAgenda> ?s.
  //     BIND ( <http://purl.org/pav/derivedFrom> AS ?p )
  //     BIND ( ""${sparqlEscapeString( domNode.outerHTML )}"" AS ?o )
  //   }
}

class EditorDocument {
  constructor(content) {
    for( var key in content )
      this[key] = content[key];
  }

  // uri = null
  // title = null
  // context = null
  // content = null
}

/**
 * Retrieves the EditorDocument belonging to the supplied uuid
 *
 * @method editorDocumentFromUuid
 *
 * @param {string} uuid UUID which is coupled to the EditorDocument as
 * mu:uuid property.
 *
 * @return {EditorDocument} Object representing the EditorDocument
 */
function editorDocumentFromUuid( uuid ){
  // We have removed dc:title from here
  return query(
    `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT * WHERE {
     GRAPH <http://mu.semte.ch/application> {
       ?uri a <http://mu.semte.ch/vocabularies/ext/EditorDocument>;
            ext:editorDocumentContent ?content;
            ext:editorDocumentContext ?context;
            <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString( uuid )}
       }
     }`)
    .then( (queryResult) => {
      if( queryResult.results.bindings.length === 0 )
        throw `No content found for EditorDocument ${uuid}`;
      const result = queryResult.results.bindings[0];

      const doc = new EditorDocument({
        uri: result.uri.value,
        // title: result.title,
        context: JSON.parse( result.context.value ),
        content: result.content.value
      });

      return doc;
    } );
}

/**
 * Ensures all resources related to the agenda have a UUID in the
 *  mu.semte.ch graph.  For this, we read the concepts from the old
 *  graph, and verify that they have a UUID in the global graph.
 *
 * @method ensureGlobalUuidsForAgendaImport
 *
 * @param {string} graphName Name of the graph in which we'll search
 * for the resources.
 *
 * @return {Promise} promise which resolves when the operation has
 * finished.
 */

function ensureGlobalUuidsForAgendaImport( graphName ){
  return query(
    `SELECT ?subject WHERE {
       GRAPH ${sparqlEscapeUri( graphName )} {
         ?subject a ?type
         VALUES ?type {
           <http://mu.semte.ch/vocabularies/ext/EditorDocument>
           <http://data.vlaanderen.be/ns/besluit#Zitting>
           <http://data.vlaanderen.be/ns/besluit#Agenda>
           <http://data.vlaanderen.be/ns/besluit#AgendaPunt>
         }
       }
     }`).then( (response) => {
       const promiseArr =
             response.results.bindings.map( ({subject}) => {
               const query = `
                 INSERT {
                   GRAPH <http://mu.semte.ch/application> {
                     ${sparqlEscapeUri(subject.value)}
                       <http://mu.semte.ch/vocabularies/core/uuid>
                         ${sparqlEscapeString( uuid() )}.
                   }
                 } WHERE {
                   NOT EXISTS {
                     GRAPH <http://mu.semte.ch/application> {
                       ${sparqlEscapeUri(subject.value)}
                         <http://mu.semte.ch/vocabularies/core/uuid> ?uuid.
                     }
                   }
                 }`;

               console.log( query );

               return update(query); } );
       return Promise.all( promiseArr );
     } );
}

export { importAgenda, editorDocumentFromUuid, importAgendaFromDoc, ensureGlobalUuidsForAgendaImport };
