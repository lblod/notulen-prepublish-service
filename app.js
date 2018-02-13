import { app, query, uuid } from 'mu';
import FIXTURES from './fixtures/default';
import { walk } from './marawa/node-walker';
import { cleanRichNodes, cleanContexts } from './support/rich-node-printer';
import jsdom from 'jsdom';
import { analyse as analyseContexts } from './marawa/rdfa-context-scanner';
import getRdfaGraph from 'graph-rdfa-processor';
import { get } from './marawa/ember-object-mock';
import { graphForDomNode, saveGraphInTriplestore, saveNodeInTriplestore, cleanTempGraph } from './support/graph-context-helpers';
import { importAgenda } from './support/notule-export-helpers';


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
  const node = dom.window.document.querySelector('div[typeof="besluit:Zitting"]');

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
