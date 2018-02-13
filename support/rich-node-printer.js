import {get, set} from '../marawa/ember-object-mock';

/**
 * Ugly tooling which makes it slightly easier to print RichNodes as
 * exposed by MARAWA and the likes.  This tooling simply removes
 * certain properties from the rendered output.
 */
function cleanContexts( [ node, ...nodes ] ){
  node.rdfaAttributes = node.richNode[0].rdfaAttributes;
  node.rdfaContext = node.richNode[0].rdfaContext;

  node.parent = undefined;
  node.domNode = undefined;
  node.richNode = undefined;

  if( nodes.length )
    return [node, ...cleanContexts(nodes)];
  else
    return [node];
}

/**
 * Walks through the supplied RichNode items, and cleans them from
 *  their recursive content.
 *
 * @method cleanRichNodes
 *
 * @param {RichNode} node Parent node of the cleaned tree.
 *
 * @return {RichNode} Returns RichNodes in which the parent and
 * domNode is removed.
 */
function cleanRichNodes( node ){
  if( get(node, 'domNode') )
    set( node, 'domNode', undefined );
  if( get(node, 'parent') )
    set( node, 'parent', undefined );
  ( get(node, 'children') || [] ).forEach( (child) => cleanRichNodes(child) );
  return node;
}

export { cleanRichNodes, cleanContexts };
