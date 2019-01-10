/**
 * Helpers for maintaining a DOM tree.
 */

import { analyse as analyseContexts,
         resolvePrefixes
       } from '@lblod/marawa/rdfa-context-scanner';

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
 * Finds all dom nodes with the supplied type
 *
 * @method findAllNodesOfType
 *
 * @param {DomNode} DomNode Highest level DOM node
 * @param {string} type URI of the type which should be matched
 *
 * @return {[DomNode]} Dom Nodes which have the correct type
 */
function findAllNodesOfType( node, type ) {
  const [ {semanticNode: richNode} ] = analyseContexts( node );

  let matchingNodes = [];

  const processItem = function( richNode ){
    if( richNode.rdfaAttributes.typeof ) {
      const nodeTypes = resolvePrefixes( richNode.rdfaAttributes, richNode.rdfaPrefixes ).typeof;
      if( nodeTypes.includes( type ) )
        matchingNodes.push( richNode );
    }
  };

  const walk = function( richNode, functor ){
    functor(richNode);
    (richNode.children || []).forEach( (child) => walk( child, functor ) );
  };

  walk( richNode, processItem );

  return matchingNodes.map( (richNode) => richNode.domNode );
}

export { findFirstNodeOfType, findAllNodesOfType };
