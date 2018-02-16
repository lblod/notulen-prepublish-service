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

app.post('/publish/agenda/:documentIdentifier', (req, res) => {
  editorDocumentFromUuid( req.params.documentIdentifier ).then( (doc) => {
    const [ topDomNode, dom ] = nodeAndDomForEditorDocument( doc );

    const node = findFirstNodeOfType( topDomNode, 'http://data.vlaanderen.be/ns/besluit#Zitting' );

    const graphName = `http://notule-importer.mu/${uuid()}`;

    const graph = graphForDomNode( node, dom, "https://besluit.edu" );
    removeBlankNodes( graph );

    saveGraphInTriplestore( graph, graphName )
      .then( () => importAgendaFromDoc( graphName, doc, node ) )
      .then( () => ensureGlobalUuidsForAgendaImport( graphName ) )
      .then( () => cleanTempGraph( graphName ) )
      .then( () => res.send( { success: true, item: graphName, content: graph.toString() } ) )
      .catch( (err) => {
        return res
          .status(400)
          .send( { message: `An error occurred, could not save to ${graphName}`, err: JSON.stringify(err) } );
      } );
  } );
});

app.post('/publish/notule/:documentIdentifier', (req, res) => {
  editorDocumentFromUuid( req.params.documentIdentifier ).then( (doc) => {
    let topDomNode, dom;
    [ topDomNode, dom ] = nodeAndDomForEditorDocument( doc );

    importNotuleFromDoc( topDomNode, dom, doc )
      .then( () => {
        let topDomNode, dom;
        [ topDomNode, dom ] = nodeAndDomForEditorDocument( doc );
        return importDecisionsFromDoc( topDomNode, dom, doc );
      })
      .then( () => res.send( { success: true } ) )
      .catch( (err) => {
        return res
          .status(400)
          .send( { message: `An error occurred`, err: JSON.stringify( err ) } );
      } );
  } );
});
