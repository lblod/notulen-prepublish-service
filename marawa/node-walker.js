import {get, set} from './ember-object-mock';

if( ! Node ) {
  var Node = { ATTRIBUTE_NODE: 2,
               CDATA_SECTION_NODE: 4,
               COMMENT_NODE: 8,
               DOCUMENT_FRAGMENT_NODE: 11,
               DOCUMENT_NODE: 9,
               DOCUMENT_POSITION_CONTAINED_BY: 16,
               DOCUMENT_POSITION_CONTAINS: 8,
               DOCUMENT_POSITION_DISCONNECTED: 1,
               DOCUMENT_POSITION_FOLLOWING: 4,
               DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32,
               DOCUMENT_POSITION_PRECEDING: 2,
               DOCUMENT_TYPE_NODE: 10,
               ELEMENT_NODE: 1,
               ENTITY_NODE: 6,
               ENTITY_REFERENCE_NODE: 5,
               NOTATION_NODE: 12,
               PROCESSING_INSTRUCTION_NODE: 7,
               TEXT_NODE: 3 };
}

/**
 * Represents an enriched DOM node.
 *
 * The DOM node is available in the 'domNode' property.
 *
 * @module editor-core
 * @class RichNode
 * @constructor
 * @extends EmberObject
 */
class RichNode {
  constructor(content) {
    for( var key in content )
      this[key] = content[key];
  }
  region() {
    const start = get(this, 'start');
    const end = get(this, 'end');

    return [ start, end || start ];
  }
  length() {
    const end = get(this, 'end') || 0;
    const start = get(this, 'start') || 0;
    const diff = Math.max( 0, end - start );
    return diff;
  }
  isInRegion(start, end) {
    return get(this, 'start') >= start && get(this, 'end') <= end;
  }
  isPartiallyInRegion(start, end) {
    return ( get(this, 'start') >= start && get(this, 'start') < end )
      || ( get(this, 'end') > start && get(this, 'end') <= end );
  }
}

/**
 * DOM tree walker producing RichNodes
 *
 * @module editor-core
 * @class NodeWalker
 * @constructor
 * @extends EmberObject
 */
class NodeWalker {
  /**
   * Processes a single dom node.
   */
  processDomNode( domNode, parentNode, start = 0 ) {
    console.log( `processing ${domNode}` );
    const myStart = (parentNode && get(parentNode, 'end')) || start;
    const richNode = this.createRichNode({
      domNode: domNode,
      parent: parentNode,
      start: myStart,
      end: myStart,
      type: this.detectDomNodeType( domNode )
    });

    // For tags, recursively analyse the children
    if (get(richNode, 'type') === 'tag') {
      return this.processTagNode( richNode );
    }
    // For text nodes, add the content and update the index
    else if (get(richNode, 'type') === 'text') {
      return this.processTextNode( richNode );
    }
    // For comment nodes, set update the index
    else { // if (get(richNode, 'type') == 'other')
      return this.processOtherNode( richNode );
    }
  }

  /**
   * Called when stepping into a child Dom node
   */
  stepInDomNode( richNode, childDomNode ) {
    return this.processDomNode( childDomNode, richNode );
  }

  /**
   * Steps from one (or no) child node to the next.
   */
  stepNextDomNode( richNode , nextDomChildren ) {
    // what if we have no children?  this is broken
    const [ firstChild, ...nextChildren ] = nextDomChildren;
    const richChildNode = this.stepInDomNode( richNode, firstChild );
    set( richNode, 'end', get(richChildNode, 'end') );
    if ( nextChildren.length )
      return [ richChildNode, ...this.stepNextDomNode( richNode, nextChildren ) ];
    else
      return [ richChildNode ];
  }

  /**
   * Called when finishing the processing of all the child nodes.
   */
  /*eslint no-unused-vars: ["error", { "args": "none" }]*/
  finishChildSteps( richNode ) {
    return;
  }

  /**
   * Processes a single rich text node
   */
  processTextNode( richNode ) {
    const domNode = get(richNode, 'domNode');
    const start = get(richNode, 'start');
    let text = domNode.textContent;
    set(richNode, 'text', text);
    set(richNode, 'end', start + text.length);
    return richNode;
  }
  /**
   * Processes a single rich tag
   */
  processTagNode( richNode ) {
    console.log(`processing tag node ${richNode}`);
    set(richNode, 'end', get(richNode, 'start')); // end will be updated during run
    const domNode = get(richNode, 'domNode');
    const childDomNodes = domNode.childNodes;
    set(richNode, 'children',
        this.stepNextDomNode( richNode, childDomNodes ));
    this.finishChildSteps( richNode );
    return richNode;
  }
  /**
   * Processes a single comment node
   */
  processOtherNode( richNode ) {
    const start = get(richNode, 'start');
    set(richNode, 'end', start);
    return richNode;
  }

  /**
   * Detects the type of a DOM node
   */
  detectDomNodeType( domNode ) {
    console.log( `Detecting type of domNode ${domNode}` );

    if (domNode.hasChildNodes && domNode.hasChildNodes()) {
      console.log(`It is a tag`);
      return 'tag';
    }
    else if (domNode.nodeType != Node.COMMENT_NODE) {
      console.log(`It is text`);
      return 'text';
    }
    else {
      console.log(`It is something else`);
      return 'other';
    }
  }

  /**
   * Creates a rich node.
   *
   * You can override this method in order to add content to
   * the rich text nodes.
   */
  createRichNode( content ) {
    return new RichNode( content );
  }
}

export default NodeWalker;
export { RichNode };
