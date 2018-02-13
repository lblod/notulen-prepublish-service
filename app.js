import { app, query } from 'mu';
import FIXTURES from './fixtures/default';
import { walk } from './marawa/node-walker';
import { cleanRichNodes } from './support/rich-node-printer';
import jsdom from 'jsdom';

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
