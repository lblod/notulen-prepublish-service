/**
 * Helpers for building and using an RDFa model.
 */

import getRdfaGraph from 'graph-rdfa-processor';
import { analyse as analyseContexts, resolvePrefixes } from '../marawa/rdfa-context-scanner';


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
  const vocab = rdfaPrefixes[""] || "http://data.vlaanderen.be/ns/besluit#"; // TODO: not sure why vocab is not found

  const wrapper = dom.window.document.createElement('div');
  wrapper.appendChild( contextDomNode );

  wrapper.setAttribute( 'prefix', prefix );
  wrapper.setAttribute( 'vocab', vocab );

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
  let prefixes = [];
  for( var key in prefixObject ){
    if( key != "" )
      prefixes = [`${key}: ${prefixObject[key]}`, ...prefixes];
  }
  prefixes = [`ext: http://mu.semte.ch/vocabularies/ext/`, ...prefixes];
  return prefixes.join(" ");
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
      delete graph.subjects[skey];
    } else {
      for( let pkey in subject.predicates ){
        const predicate = subject.predicates[pkey];
        if( pkey.indexOf("_:") === 0 ) {
          delete subject.predicates[pkey];
        } else {
          let newObjectsArr = [];
          for( let idx = 0 ; idx < predicate.objects.length ; idx++ ) {
            const value = predicate.objects[idx];
            if( value.value.indexOf( "_:" ) === 0 && value.type === "http://www.w3.org/1999/02/22-rdf-syntax-ns#object" ) {
            } else {
              newObjectsArr = [ value , ...newObjectsArr ];
            }
          }
          if( newObjectsArr.length > 0 ){
            newObjectsArr.reverse();
            predicate.objects = newObjectsArr;
          } else {
            delete subject.predicates[pkey];
          }
        }
      }
      if( Object.keys( subject.predicates ).length === 0 ) {
        delete graph.subjects[skey];
      }
    }
  }
  return graph;
}

export { graphForDomNode, removeBlankNodes };
