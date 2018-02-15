import { app, query, uuid } from 'mu';
import FIXTURES from './fixtures/default';
import { walk } from './marawa/node-walker';
import { cleanRichNodes, cleanContexts } from './support/rich-node-printer';
import jsdom from 'jsdom';
import { analyse as analyseContexts } from './marawa/rdfa-context-scanner';
import getRdfaGraph from 'graph-rdfa-processor';
import { get } from './marawa/ember-object-mock';
import { graphForDomNode, saveGraphInTriplestore, saveNodeInTriplestore, cleanTempGraph, findFirstNodeOfType, removeBlankNodes } from './support/graph-context-helpers';
import { importAgenda, importAgendaFromDoc, editorDocumentFromUuid, ensureGlobalUuidsForAgendaImport } from './support/notule-export-helpers';


app.get('/', function( req, res ) {
  res.send({ msg: 'Hello mu-javascript-template' });
} );

app.get('/query', function( req, res ) {
  var myQuery = `
    SELECT *
    WHERE {
      GRAPH <http://mu.semte.ch/application> {
        ?s ?p ?o.
      }
    }`;

  query( myQuery )
    .then( function(response) {
      res.send( JSON.stringify( response ) );
    })
    .catch( function(err) {
      res.send( "Oops something went wrong: " + JSON.stringify( err ) );
    });
} );

app.get('/fixtures/aanstelling', (req, res) => res.send( { content: FIXTURES.aanstelling } ));
app.get('/fixtures/langeAanstelling', (req, res) => res.send( { content: FIXTURES.langeAanstelling } ));

app.get('/walk/aanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.aanstelling );
  const node = dom.window.document.querySelector("div.annotation-snippet");
  const walkedNodes = walk( node );
  const cleanNodes = cleanRichNodes( walkedNodes );

  res.send({ nodes: cleanNodes });
});

app.get('/walk/langeAanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.langeAanstelling );
  const node = dom.window.document.querySelector("#ember279");
  const walkedNodes = walk( node );
  const cleanNodes = cleanRichNodes( walkedNodes );

  res.send({ nodes: cleanNodes });
});

app.get('/scan/aanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.aanstelling );
  const node = dom.window.document.querySelector("div.annotation-snippet");
  const contexts = analyseContexts( node );
  const cleanedContexts = cleanContexts( contexts );

  res.send({ contexts: cleanedContexts });
});

app.get('/scan/langeAanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.langeAanstelling );
  const node = dom.window.document.querySelector("#ember279");
  const contexts = analyseContexts( node );
  const cleanedContexts = cleanContexts( contexts );

  res.send({ contexts: cleanedContexts });
});

app.get('/scan/notuleNiel', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.notuleNiel );
  const node = dom.window.document.querySelector("body");
  const contexts = analyseContexts( node );
  const cleanedContexts = cleanContexts( contexts );

  res.send({ contexts: cleanedContexts });
});

app.get('/rdfa/aanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.aanstelling );
  let graph = getRdfaGraph(dom.window.document.querySelector("div.annotation-snippet"), { baseURI: "https://data.vlaanderen.be/vlavirgem/29348" } );
  res.send( { graph: graph.toString() } );
});

app.get('/rdfa/langeAanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.langeAanstelling );
  let graph = getRdfaGraph(dom.window.document.querySelector("div.annotation-snippet"), { baseURI: "https://data.vlaanderen.be/vlavirgem/29348" } );
  res.send( { graph: graph.toString() } );
});

app.get('/rdfaPlus/aanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.aanstelling );
  const node = dom.window.document.querySelector('div.annotation-snippet');
  const graph = graphForDomNode( node, dom, "https://besluit.edu/" );
  res.send( { graph: graph.toString() } );
});

app.get('/rdfaPlus/langeAanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.langeAanstelling );
  const node = dom.window.document.querySelector('div.annotation-snippet');
  const graph = graphForDomNode( node, dom, "https://besluit.edu/" );
  res.send( { graph: graph.toString() } );
});

app.get('/rdfaPlus/langeAanstelling/alles', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.langeAanstelling );
  const node = dom.window.document.querySelector('#ember279');
  const graph = graphForDomNode( node, dom, "https://besluit.edu/" );
  res.send( { graph: graph.toString() } );
});

app.get('/rdfaDump/langeAanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.aanstelling );
  const node = dom.window.document.querySelector('div.annotation-snippet');

  const graphName = `http://notule-importer.mu/${uuid()}`;

  const graph = graphForDomNode( node, dom, "https://besluit.edu/" );
  saveGraphInTriplestore( graph, graphName )
    .then( () => {
      saveNodeInTriplestore( node, graphName );
    } )
    .then( () => res.send( { graph: graphName } ) )
    .catch( () => res.send( { message: `An error occurred, could not save to ${graphName}` } ) );
});

app.get('/rdfaDump/notuleNiel', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.notuleNiel );
  const node = dom.window.document.querySelector('div[typeof="besluit:Zitting"]');

  const graphName = `http://notule-importer.mu/${uuid()}`;

  const graph = graphForDomNode( node, dom, "https://besluit.edu" );
  console.log( graph.toString() );
  saveGraphInTriplestore( graph, graphName )
    .then( () => saveNodeInTriplestore( node, graphName ) )
    .then( () => res.send( { graph: graphName, content: graph.toString() } ) )
    .catch( () => res.send( { message: `An error occurred, could not save to ${graphName}` } ) );
});

app.get('/extractAgenda/notuleNiel', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.notuleNiel );
  const topDomNode = dom.window.document.querySelector('body');
  const node = findFirstNodeOfType( topDomNode, 'http://data.vlaanderen.be/ns/besluit#Zitting' );

  const graphName = `http://notule-importer.mu/${uuid()}`;

  const graph = graphForDomNode( node, dom, "https://besluit.edu" );
  console.log( graph.toString() );
  saveGraphInTriplestore( graph, graphName )
    .then( () => saveNodeInTriplestore( node, graphName ) )
    .then( () => importAgenda( graphName ) )
    .then( () => cleanTempGraph( graphName ) )
    .then( () => res.send( { item: graphName, content: graph.toString() } ) )
    .catch( (err) => res.send( { message: `An error occurred, could not save to ${graphName}`, err: err } ) );
});

app.get('/extractAgenda/fromDb', (req, res) => {
  editorDocumentFromUuid( "5A855347D6498B000900002A" ).then( (doc) => {
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

    const node = findFirstNodeOfType( topDomNode, 'http://data.vlaanderen.be/ns/besluit#Zitting' );

    const graphName = `http://notule-importer.mu/${uuid()}`;

    const graph = graphForDomNode( node, dom, "https://besluit.edu" );
    removeBlankNodes( graph );

    saveGraphInTriplestore( graph, graphName )
      .then( () => importAgendaFromDoc( graphName, doc, node ) )
      .then( () => ensureGlobalUuidsForAgendaImport( graphName ) )
      .then( () => cleanTempGraph( graphName ) )
      .then( () => res.send( { item: graphName, content: graph.toString() } ) )
      .catch( (err) => res.send( { message: `An error occurred, could not save to ${graphName}`, err: JSON.stringify(err) } ) );
  } );
});


app.post('/publish/agenda/:documentIdentifier', (req, res) => {
  editorDocumentFromUuid( req.params.documentIdentifier ).then( (doc) => {
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

    const node = findFirstNodeOfType( topDomNode, 'http://data.vlaanderen.be/ns/besluit#Zitting' );

    const graphName = `http://notule-importer.mu/${uuid()}`;

    const graph = graphForDomNode( node, dom, "https://besluit.edu" );
    removeBlankNodes( graph );

    saveGraphInTriplestore( graph, graphName )
      .then( () => importAgendaFromDoc( graphName, doc, node ) )
      .then( () => ensureGlobalUuidsForAgendaImport( graphName ) )
      .then( () => cleanTempGraph( graphName ) )
      .then( () => res.send( { item: graphName, content: graph.toString() } ) )
      .catch( (err) => res.send( { message: `An error occurred, could not save to ${graphName}`, err: JSON.stringify(err) } ) );
  } );
});
