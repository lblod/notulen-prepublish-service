/**
 * The library helps in finding the correct RDFa context to process,
 * and for retrieving the graph of triples from the discovered RDFa
 * ContextNode.
 */
import { update, sparqlEscapeString } from 'mu';
import getRdfaGraph from 'graph-rdfa-processor';
import { get } from '../marawa/ember-object-mock';
import { analyse as analyseContexts } from '../marawa/rdfa-context-scanner';


/**
 * Returns an RDF graph which contains the RDFa for the supplied
 *  Dom Node.
 *
 * @method graphForContextNode
 * 
 * @param {DomNode} node dom node from which the RDFa will be
 * extracted
 * @param {JSDOM} JSDOM Dom which can be used for creating nodes
 *
 * @return {RdfaGraph} Graph with supplied RDFa content
 */
function graphForDomNode( node, dom, baseUri ){
  const ctx = analyseContexts( node )[0];
  const contextDomNode = ctx.semanticNode.domNode;

  const rdfaPrefixes = ctx.semanticNode.rdfaPrefixes;
  const prefix = extractPrefixString( rdfaPrefixes );
  const vocab = rdfaPrefixes[""];

  const wrapper = dom.window.document.createElement('div');
  wrapper.appendChild( contextDomNode );

  wrapper.setAttribute( 'prefix', prefix );
  wrapper.setAttribute( 'vocab', vocab );
  console.log(`Prefix is ${prefix}`);
  console.log( prefix );
  console.log( JSON.stringify( prefix ) );
  console.log(`Vocab is ${vocab}`);
  console.log( vocab );
  console.log( JSON.stringify( vocab ) );

  const doc = new dom.window.Document();
  doc.appendChild( wrapper );

  return getRdfaGraph( doc, { baseURI: baseUri } );
}

/**
 * Extracts the prefix string from the prefixObject
 *
 * @method extractPrefixString
 *
 * @param {Object} prefixObject Prefix object from the rdfa scanner
 *
 * @return {string} String which can be set as the prefix attribute of
 * a dom node.
 *
 * @private
 */
function extractPrefixString( prefixObject ){
  let resultStr = "";
  for( var key in prefixObject ){
    if( key != "" )
      resultStr += ` ${key}: ${prefixObject[key]}`;
  }
  return resultStr;
}

/**
 * Saves the supplied RDFa graph in the triplestore.
 * 
 * This may be a desired step in processing the contents which ought
 * to be saved in the final triplestore.  The contents can initially
 * be writen to this temporary store.  From here, more complex queries
 * can be executed to ensure only correct data is inserted into the
 * shared graph.
 *
 * @method saveGraphInTriplestore
 * 
 * @param {RdfaGraph} graph Graph which contains the triples
 * @param {string} graphUri URI in which the contents should be saved
 *
 * @return {Promise} Returns truethy when the store could be populated.
 */
function saveGraphInTriplestore( graph, graphUri ) {
  return update(`INSERT DATA { GRAPH <${graphUri}> { ${graph.toString()} } }`);
}

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
  console.log(`Saving ${node} to ${resource}`);
  const html = node.outerHTML;
  console.log(`HTML of node is ${node}`);
  const escapedHtml = sparqlEscapeString( html );
  console.log(`Escaped html of node is ${escapedHtml}`);

  // We've put two quotes around escapedHtml to make the escapedHtml happy.  We can probably do better in the template.
  return update( `PREFIX pav: <http://purl.org/pav/>
INSERT DATA { GRAPH <http://mu.semte.ch/application> { <${resource}> pav:derivedFrom ""${escapedHtml}"". } }` );
}

/**
 * Removes all content from a temporary graph
 *
 * @method cleanTempGraph
 * 
 * @param {string} tempGraph Temporary graph which should be cleared.
 *
 * @return {Promise} Promise which emits successfully if the graph was
 * correctly cleaned.
 */
function cleanTempGraph( tempGraph ) {
  console.log(`cleaning temporary graph ${tempGraph}`);
  update( `DELETE WHERE { GRAPH <${tempGraph}> {?s ?p ?o.} }` );
}

/**
 * Finds the first dom node with the supplied type
 *
 * @method findFirstNodeOfType
 *
 * @param {DomNode} DomNode Highest level DOM node
 * @param {string} type URI of the type which should be matched
 *
 * @return {DomNode} Dom Node which has the correct type
 */
function findFirstNodeOfType( node, type ) {
  console.log(`Finding first node of type ${type} in ${node}`);
  const orderedContexts = analyseContexts( node );
  for( var idx = 0; idx < orderedContexts.length; idx++ ) {
    let ctxObj = orderedContexts[idx];
    for( var cdx = 0; cdx < ctxObj.context.length; cdx++ ) {
      let triple = ctxObj.context[cdx];
      if( triple.predicate === "a"
          && triple.object === type )
        return ctxObj.semanticNode.domNode;
    }
  }
  console.log(`Could not find resource of type ${type}`);
  return null;
}

/**
 * Removes the blank nodes from the supplied RDFa graph
 *
 * @method removeBlankNodes
 *
 * @param {RdfaGraph} graph Graph from which the blank nodes will be
 * removed.
 *
 * @return {RdfaGraph} Manipulated graph with removed contents
 */
function removeBlankNodes( graph ){
  for( let skey in graph.subjects ){
    const subject = graph.subjects[skey];
    if( skey.indexOf("_:") === 0 ) {
      console.log( `Will remove ${skey}` );
      delete graph.subjects[skey];
    } else {
      for( let pkey in subject.predicates ){
        const predicate = subject.predicates[pkey];
        if( pkey.indexOf("_:") === 0 ) {
          console.log( `Will remove predicate ${pkey}` );
          delete subject.predicates[pkey];
        } else {
          let newObjectsArr = [];
          for( let idx = 0 ; idx < predicate.objects.length ; idx++ ) {
            const value = predicate.objects[idx];
            if( value.value.indexOf( "_:" ) === 0 && value.type === "http://www.w3.org/1999/02/22-rdf-syntax-ns#object" ) {
              console.log( `Will remove value ${value.value}` );
            } else {
              newObjectsArr = [ value , ...newObjectsArr ];
            }
          }
          if( newObjectsArr.length > 0 ){
            newObjectsArr.reverse();
            predicate.objects = newObjectsArr;
          } else {
            console.log(`No keys left in ${pkey}, removing`);
            delete subject.predicates[pkey];
          }
        }
      }
      if( Object.keys( subject.predicats ).length == 0 )
        console.log(`No keys left in ${skey}, removing`);
        delete graph.subjects[skey];
    }
  }
  return graph;
}


export { graphForDomNode, saveGraphInTriplestore, saveNodeInTriplestore, cleanTempGraph, findFirstNodeOfType, removeBlankNodes }
