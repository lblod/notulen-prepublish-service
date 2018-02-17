import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';

import { ensureGlobalUuidsForTypes } from './application-graph-helpers';
import { saveGraphInTriplestore, cleanTempGraph } from './temporary-graph-helpers';

import { findFirstNodeOfType, findAllNodesOfType } from './dom-helpers';

import { graphForDomNode, removeBlankNodes } from './rdfa-helpers';

/**
 * This file contains helpers for exporting content from the notule.
 */


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

export { importNotuleFromDoc, importDecisionsFromDoc };
