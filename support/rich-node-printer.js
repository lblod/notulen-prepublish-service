import {get, set} from '../marawa/ember-object-mock';

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

export { cleanRichNodes };
