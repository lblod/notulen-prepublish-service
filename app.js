import { app, query } from 'mu';
import FIXTURES from './fixtures/default';

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
