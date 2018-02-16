import { app, uuid } from 'mu';
import jsdom from 'jsdom';
import { graphForDomNode, saveGraphInTriplestore, cleanTempGraph, findFirstNodeOfType, removeBlankNodes } from './support/graph-context-helpers';
import { importAgendaFromDoc, editorDocumentFromUuid, ensureGlobalUuidsForAgendaImport } from './support/notule-export-helpers';
import { importNotuleFromDoc, importDecisionsFromDoc } from './support/notule-export-helpers';

function nodeAndDomForEditorDocument( doc ){
  const dom = new jsdom.JSDOM( `<body>${doc.content}</body>` );
  const topDomNode = dom.window.document.querySelector('body');
  topDomNode.setAttribute( 'vocab', doc.context.vocab );
  topDomNode.setAttribute( 'prefix', ( () => {
    var str = "";
    for( var key in doc.context.prefix )
      if( key != "" )
        str += `${key}: ${doc.context.prefix[key]} `;
    return str;
  } )() );

  return [ topDomNode, dom ];
}

app.post('/publish/agenda/:documentIdentifier', async function(req, res) {
  try {
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const [ topDomNode, dom ] = nodeAndDomForEditorDocument( doc );
    const node = findFirstNodeOfType( topDomNode, 'http://data.vlaanderen.be/ns/besluit#Zitting' );
    const graphName = `http://notule-importer.mu/${uuid()}`;
    const graph = graphForDomNode( node, dom, "https://besluit.edu" );
    removeBlankNodes( graph );

    await saveGraphInTriplestore( graph, graphName );
    await importAgendaFromDoc( graphName, doc, node );
    await ensureGlobalUuidsForAgendaImport( graphName );
    await cleanTempGraph( graphName );

    res.send( { success: true, item: graphName, content: graph.toString() } );
  } catch (err) {
    res.status(400)
      .send( { message: `An error occurred while publishing agenda ${req.params.documentIdentifier}`, err: JSON.stringify(err) } );
  }
} );

app.post('/publish/notule/:documentIdentifier', async function(req, res) {
  try {
    const documentId = req.params.documentIdentifier;
    const doc = await editorDocumentFromUuid( documentId );

    let topDomNode, dom;
    [ topDomNode, dom ] = nodeAndDomForEditorDocument( doc );

    await importNotuleFromDoc( topDomNode, dom, doc );

    [ topDomNode, dom ] = nodeAndDomForEditorDocument( doc );
    await importDecisionsFromDoc( topDomNode, dom, doc );
    res.send( { success: true } );
  } catch (err) {
    res
      .status(400)
      .send( { message: `An error occurred while publishing minutes for ${req.params.documentIdentifier}`, err: JSON.stringify( err ) } );
  }
});
