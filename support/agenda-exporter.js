/**
 * Importer for agenda from Meeting Minutes
 */

import { query, update,
         sparqlEscapeUri,
         uuid } from 'mu';

import { findFirstNodeOfType } from './dom-helpers';
import { graphForDomNode, removeBlankNodes } from './rdfa-helpers';
import { saveGraphInTriplestore, cleanTempGraph } from './temporary-graph-helpers';
import { ensureGlobalUuidsForTypes, insertUnionOfQueries } from './application-graph-helpers';

/**
 * Imports the agenda stored in Doc into the triplestore
 *
 * @method importAgendaFromDoc
 * 
 * @param {EditorDocument} doc EditorDocument in which the agenda is
 * contained.
 *
 * @return {Promise} Promise which returns positive iff the agenda was
 * imported correctly
 */
async function importAgendaFromDoc( doc ) {
  const node = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );
  const graphName = `http://notule-importer.mu/${uuid()}`;
  const graph = graphForDomNode( node, doc.getDom(), "https://besluit.edu" );
  removeBlankNodes( graph );

  await saveGraphInTriplestore( graph, graphName );

  if( await tempGraphHasAgenda( graphName ) ) {
    await importAgendaTriplesFromDoc( graphName, doc, node );
    await ensureGlobalUuidsForAgendaImport( graphName );
    await cleanTempGraph( graphName );
  } else {
    await cleanTempGraph( graphName );
    throw "Document did not contain Agenda";
  }
}

/**
 * Returns a truethy value from its promise iff the temporary graph
 * contained an agenda
 *
 * @method tempGraphHasAgenda
 *
 * @param {string} graphName Name of the temp graph which we'll search
 * through.
 *
 * @return {Promise} Promise which returns truethy iff the temporary
 * graph contained an agenda.
 */
async function tempGraphHasAgenda( graphName ) {
  const queryResponse = await query(`SELECT ?uri
    WHERE {
      GRAPH ${sparqlEscapeUri( graphName )} {
        ?uri a <http://data.vlaanderen.be/ns/besluit#Agenda>.
      }
    } LIMIT 1
  `);

  return queryResponse.results.bindings.length > 0;
}

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
 *
 * @private
 */
async function importAgenda( tempGraph ){
  await insertUnionOfQueries( {
    prefix: "",
    sourceGraph: tempGraph,
    splitCalls: false,
    queries: [
      ` ?s a <http://data.vlaanderen.be/ns/besluit#Zitting>.
        ?s ?p ?o.
        VALUES ?p { <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>
                    <http://data.vlaanderen.be/ns/besluit#behandelt> }
      `,
      `?ss a <http://data.vlaanderen.be/ns/besluit#Zitting>.
       ?ss <http://data.vlaanderen.be/ns/besluit#behandelt> ?s.
       ?s ?p ?o.
       VALUES ?p {
         <http://purl.org/dc/terms/title>
         <http://data.vlaanderen.be/ns/besluit#geplandOpenbaar>
         <http://data.vlaanderen.be/ns/besluit#Agendapunt.type>
         <http://purl.org/dc/terms/description>
       }`] } );
}

/**
 * Imports the agenda in the tempGraph, which originates from the
 * supplied EditorDocument to the triplestore.
 *
 * @method importAgendaTriplesFromDoc
 *
 * @param {string} tempGraph Name of the graph from which the contents
 * originate.
 * @param {EditorDocument} doc Document from which the contents originated.
 * @param {DomNode} domNode Node which was used to import the contents
 * into the triplestore.
 *
 * @return {Promise} Yields positive when the content has been saved
 * to the main triplestore.
 *
 * @private
 */
async function importAgendaTriplesFromDoc( tempGraph, doc, domNode ) {
  // make agenda resource
  // ensure output is written to pav:derivedFrom

  await insertUnionOfQueries({
    prefix: "",
    sourceGraph: tempGraph,
    splitCalls: false,
    queries: [
      ` ?s a <http://data.vlaanderen.be/ns/besluit#Zitting>.
        ?s ?p ?o.
        VALUES ?p {
          <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>
          <http://data.vlaanderen.be/ns/besluit#heeftAgenda>
          <http://data.vlaanderen.be/ns/besluit#geplandeStart>
          <http://data.vlaanderen.be/ns/besluit#isGehoudenDoor>
        }`
      ,
      ` ?ss a <http://data.vlaanderen.be/ns/besluit#Zitting>;
            <http://data.vlaanderen.be/ns/besluit#heeftAgenda> ?s.
        ?s ?p ?o.
        VALUES ?p {
          <http://data.vlaanderen.be/ns/besluit#heeftAgendapunt>
          <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>
        }`
      ,
      ` ?ss a <http://data.vlaanderen.be/ns/besluit#Zitting>;
            <http://data.vlaanderen.be/ns/besluit#heeftAgenda>/<http://data.vlaanderen.be/ns/besluit#heeftAgendapunt>
              ?s.
        ?s ?p ?o.
        VALUES ?p {
          <http://purl.org/dc/terms/title>
          <http://purl.org/dc/terms/description>
          <http://data.vlaanderen.be/ns/besluit#geplandOpenbaar>
          <http://data.vlaanderen.be/ns/besluit#Agendapunt.type>
        }`
      // , // We skip this query for now, as we will only publish these
      //   // Meeting Minutes after the meeting was held
      // ` ?s a <http://data.vlaanderen.be/ns/besluit#Zitting>.
      //   BIND ( <http://data.vlaanderen.be/ns/besluit#heeftNotulen> AS ?p )
      //   BIND ( ${sparqlEscapeUri(doc.uri)} AS ?o )
      // `
      // , // We skipped this query. It should insert the contents, but
      //   // that should be handled by a separate INSERT DATA query.
      // ` ?ss <http://data.vlaanderen.be/ns/besluit#heeftAgenda> ?s.
      //   BIND ( <http://purl.org/pav/derivedFrom> AS ?p )
      //   BIND ( ""${sparqlEscapeString( domNode.outerHTML )}"" AS ?o )
      // `
      ]});
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
 *
 * @private
 */
async function ensureGlobalUuidsForAgendaImport( graphName ){
  await ensureGlobalUuidsForTypes( graphName, [
    "http://mu.semte.ch/vocabularies/ext/EditorDocument",
    "http://data.vlaanderen.be/ns/besluit#Zitting",
    "http://data.vlaanderen.be/ns/besluit#Agenda",
    "http://data.vlaanderen.be/ns/besluit#Agendapunt"
  ]);
}

export { importAgendaFromDoc };
