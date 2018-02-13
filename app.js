import { app, query } from 'mu';
import FIXTURES from './fixtures/default';
import { walk } from './marawa/node-walker';
import { cleanRichNodes, cleanContexts } from './support/rich-node-printer';
import jsdom from 'jsdom';
import { analyse as analyseContexts } from './marawa/rdfa-context-scanner';
import getRdfaGraph from 'graph-rdfa-processor';
import { get } from './marawa/ember-object-mock';


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

app.get('/rdfaPlus/langeAanstelling', (req, res) => {
  const dom = new jsdom.JSDOM( FIXTURES.langeAanstelling );
  const node = dom.window.document.querySelector('div.annotation-snippet');
  const ctx = analyseContexts( node )[0];
  const ctxDomNode = ctx.richNode[0].domNode;

  const wrapper = dom.window.document.createElement('div');
  wrapper.appendChild( ctxDomNode );
  // note, it may be that we need to pick this from a different child...
  wrapper.setAttribute( 'prefix', ctx.richNode[0].rdfaContext[0].prefix );
  wrapper.setAttribute( 'vocab', ctx.richNode[0].rdfaContext[0].vocab );

  const doc = new dom.window.Document();
  doc.appendChild( wrapper );

  const graph = getRdfaGraph( doc, { baseURI: "https://data.vlaanderen.be/vlavirgem/29348" } );
  res.send( { graph: graph.toString() } );
});
