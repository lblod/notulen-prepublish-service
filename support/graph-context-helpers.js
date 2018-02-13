/**
 * The library helps in finding the correct RDFa context to process,
 * and for retrieving the graph of triples from the discovered RDFa
 * ContextNode.
 */
import { update } from 'mu';
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
  const contextDomNode = ctx.richNode[0].domNode;

  const prefix = ctx.richNode[0].rdfaContext[0].prefix;
  const vocab = ctx.richNode[0].rdfaContext[0].vocab;

  const wrapper = dom.window.document.createElement('div');
  wrapper.appendChild( contextDomNode );
  // note, it may be that we need to pick this from a different rdfaContext...
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



export { graphForDomNode, saveGraphInTriplestore }
