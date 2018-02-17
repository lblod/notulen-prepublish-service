import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';

import { ensureGlobalUuidsForTypes } from './application-graph-helpers';
import { saveGraphInTriplestore, cleanTempGraph } from './temporary-graph-helpers';

import { findFirstNodeOfType, findAllNodesOfType } from './dom-helpers';

import { graphForDomNode, removeBlankNodes } from './rdfa-helpers';

/**
 * This file contains helpers for exporting content from the notule.
 */


// AGENDA


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
  await importAgendaTriplesFromDoc( graphName, doc, node );
  await ensureGlobalUuidsForAgendaImport( graphName );
  await cleanTempGraph( graphName );
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
function importAgenda( tempGraph ){
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
                          <http://data.vlaanderen.be/ns/besluit#Agendapunt.type>
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
function importAgendaTriplesFromDoc( tempGraph, doc, domNode ) {
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
                           <http://data.vlaanderen.be/ns/besluit#Agendapunt.type>
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
function ensureGlobalUuidsForAgendaImport( graphName ){
  return ensureGlobalUuidsForTypes( graphName, [
    "http://mu.semte.ch/vocabularies/ext/EditorDocument",
    "http://data.vlaanderen.be/ns/besluit#Zitting",
    "http://data.vlaanderen.be/ns/besluit#Agenda",
    "http://data.vlaanderen.be/ns/besluit#Agendapunt"
  ]);
}


// NOTULEN

async function importNotuleFromDoc( node, dom, doc ){
  // Store session in temporary graph
  const sessionNode = findFirstNodeOfType( node, "http://data.vlaanderen.be/ns/besluit#Zitting" );
  const tmpGraphName = `http://notule-importer.mu/${uuid()}`;
  const tmpGraph = graphForDomNode( sessionNode, dom, "https://besluit.edu" );
  removeBlankNodes( tmpGraph );
  
  // Find outerHTML of session
  const outerHtml = sessionNode.outerHTML;

  // Store session in temporary graph (in Virtuoso)
  await saveGraphInTriplestore( tmpGraph, tmpGraphName );

  // Find URI of session
  let queryResult;
  queryResult = await query(`
    SELECT ?uri WHERE {
      GRAPH ${sparqlEscapeUri( tmpGraphName )} {
        ?uri a <http://data.vlaanderen.be/ns/besluit#Zitting>
      }
    }
  `);
  const sessionUri = queryResult.results.bindings[0].uri.value;
  
  await update(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    INSERT {
      GRAPH <http://mu.semte.ch/application> {
        ?s ?p ?o.
      }
    } WHERE {
      GRAPH ${sparqlEscapeUri( tmpGraphName )} {
        ?s a besluit:Zitting.
        ?s ?p ?o
        VALUES ?p {
          rdf:type 
          besluit:isGehoudenDoor
          besluit:geplandeStart
          prov:atLocation
          prov:startedAtTime
          prov:endedAtTime
          besluit:heeftAgenda
          ext:behandelt
        }
      }
    }
  `);
  await update(`
    INSERT DATA {
      GRAPH <http://mu.semte.ch/application> {
        ${sparqlEscapeUri( sessionUri )} 
          <http://purl.org/pav/derivedFrom>
            ""${sparqlEscapeString( outerHtml )}"".
        ${sparqlEscapeUri( sessionUri )}
          <http://data.vlaanderen.be/ns/besluit#heeftNotulen>
            ${sparqlEscapeUri( doc.uri )}.
      }
    }`);
  await ensureGlobalUuidsForTypes( tmpGraphName, [ "http://data.vlaanderen.be/ns/besluit#Zitting" ] );
  await cleanTempGraph( tmpGraphName );
  // Store session in main graph
  // including:
  // - link to editorDocument
  // - besluit:isGehoudenDoor
  // - besluit:geplandeStart
  // - prov:atLocation
  // - prov:startedAtTime
  // - prov:endedAtTime
  // - besluit:heeftAgenda
  // - inhoud van de notule opgeslagen in http://purl.org/pav/derivedFrom
  // Add UUID to session
}

async function importDecisionsFromDoc( node, dom ){
  // Store session in temporary graph
  const sessionNodes = findAllNodesOfType( node, "http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt" );
  await Promise.all( sessionNodes.map( async function(besluitNode){
    const tmpGraphName = `http://notule-importer.mu/${uuid()}`;
    const tmpGraph = graphForDomNode( besluitNode, dom, "https://besluit.edu" );
    removeBlankNodes( tmpGraph );
    // Find outerHTML of AgendaPointTreatment
    const outerHtml = besluitNode.outerHTML;
    // Store node in temporary graph (in Virtuoso)
    await saveGraphInTriplestore( tmpGraph, tmpGraphName );
    // Find URI of AgendaPointTreatment
    let queryResult;
    queryResult = await query(`
      SELECT ?uri WHERE {
        GRAPH ${sparqlEscapeUri( tmpGraphName )} {
          ?uri a <http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt>
        }
      }
    `);
    const bvapUri = queryResult.results.bindings[0].uri.value;
    
    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX eli: <http://data.europa.eu/eli/ontology#>
      INSERT {
        GRAPH <http://mu.semte.ch/application> {
          ?s ?p ?o.
        }
      } WHERE {
        GRAPH ${sparqlEscapeUri( tmpGraphName )}
        {
          {
            ?s a besluit:BehandelingVanAgendapunt.
            ?s ?p ?o
            VALUES ?p {
              rdf:type 
              besluit:gevolg
              prov:generated
            }
          } UNION {
            ?ss a besluit:BehandelingVanAgendapunt;
                prov:generated ?s.
            ?s ?p ?o.
            VALUES ?p {
              rdf:type
              eli:cites
              eli:language
              eli:title
              eli:description
              besluit:motivering
              eli:has_part
            }
          } UNION {
            ?sss a besluit:BehandelingVanAgendapunt;
                 prov:generated ?ss.
            ?ss eli:has_part ?s.
            ?s ?p ?o.
            VALUES ?p {
              rdf:type
              eli:number
              eli:language
              prov:value
            }
          } UNION {
            ?ss a besluit:BehandelingVanAgendapunt;
                prov:generated ?s.
            ?s ?p ?o.
            BIND ( <http://www.semanticdesktop.org/ontologies/2007/08/15/nao#score> AS ?p )
            BIND ( STRDT("1", xsd:float) AS ?o )
          } UNION {
            ?ss a besluit:BehandelingVanAgendapunt;
                prov:generated ?s.
            ?s eli:title ?o.
            BIND ( eli:title_short AS ?p )
          }
        }
      }
    `);
    await update(`
      INSERT DATA {
        GRAPH <http://mu.semte.ch/application> {
          ${sparqlEscapeUri( bvapUri )} 
            <http://purl.org/pav/derivedFrom>
              ""${sparqlEscapeString( outerHtml )}""
        }
      }`);
    await ensureGlobalUuidsForTypes( tmpGraphName, [
      "http://data.vlaanderen.be/ns/besluit#Zitting",
      "http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt",
      "http://data.vlaanderen.be/ns/besluit#Besluit",
      "http://data.vlaanderen.be/ns/besluit#Artikel",
      "http://data.vlaanderen.be/ns/mandaat#OntslagBesluit", // Misschien zijn ontslag/aanstelling niet nodig
      "http://data.vlaanderen.be/ns/mandaat#AanstellingsBesluit"
    ] );
    await cleanTempGraph( tmpGraphName );
  }));

  // Extract Notule into Graph
  // find all Agenda Point Treatments
  // for each Agenda Point Treatment
  // - store the inner RDFa in a separate graph (APG)
  // - generate contents from APG and Meeting graph
  //   including:
  //   - ext:behandelt  || type besluit:BehandelingVanAgendapunt  ## consumed in previous step
  //   - besluit:gevolg (vanuit BehandelingVanAgendapunt)
  //   - prov:generated (vanuit BehandelingVanAgendapunt naar besluit:Besluit | mandaat:OntslagBesluit | mandaat:AanstellingsBesluit)
  //   - het Besluit met:
  //     - eli:cites
  //     - eli:language
  //     - eli:title
  //     - eli:description (korte samenvatting)
  //     - besluit:motivering
  //     - eli:has_part (hangt artikel aan)
  //       - het artikel met:
  //         - eli:number
  //         - eli:language
  //         - prov:value (de inhoud van het artikel)
  // - inhoud BehandelingVanAgendapunt http://purl.org/pav/derivedFrom

  // Ensure all new resources have a UUID
  // Remove APG
}

export { importAgendaFromDoc };

export { importNotuleFromDoc, importDecisionsFromDoc };
