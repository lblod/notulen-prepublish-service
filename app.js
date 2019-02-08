import { app } from 'mu';

import { editorDocumentFromUuid } from './support/editor-document';
import { signVersionedAgenda,
         publishVersionedAgenda,
         ensureVersionedAgendaForDoc,
         extractAgendaContentFromDoc,
         publishVersionedNotulen,
         signVersionedNotulen,
         ensureVersionedNotulenForDoc,
         extractBesluitenLijstContentFromDoc
       } from './support/pre-importer';

import { importCoreNotuleFromDoc,
         importDecisionsFromDoc,
         importFullNotuleFromDoc,
         extractNotulenContentFromDoc
       } from './support/notule-exporter';

/**
 * Makes the current user sign the agenda for the supplied document.
 */
app.post('/signing/agenda/sign/:kind/:documentIdentifier', async function(req, res) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const preImportedAgendaUri = await ensureVersionedAgendaForDoc(doc, req.params.kind);
    await signVersionedAgenda( preImportedAgendaUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
    res.send( { success: true } );
  } catch (err) {
    console.log("We had a booboo");
    console.log(JSON.stringify(err));
    res
      .status(400)
      .send( { message: `An error occurred while pre-publishing agenda ${req.params.documentIdentifier}`,
               err: JSON.stringify(err) } );
  }
} );

/**
 * Makes the current user sign the notulen for the supplied document.
 */
app.post('/signing/notulen/sign/:kind/:documentIdentifier', async function(req, res) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const preImportedAgendaUri = await ensureVersionedNotulenForDoc(doc, req.params.kind);
    await signVersionedNotulen( preImportedAgendaUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
    res.send( { success: true } );
  } catch (err) {
    console.log("We had a booboo");
    console.log(err);
    res
      .status(400)
      .send( { message: `An error occurred while pre-publishing agenda ${req.params.documentIdentifier}`,
               err: err } );
  }
} );

/**
 * Makes the current user publish the agenda for the supplied document.
 */
app.post('/signing/agenda/publish/:kind/:documentIdentifier', async function(req, res) {
  // TODO this is 99% the same as
  // /signing/agenda/sign/:kind/:documentIdentifier, it just uses the
  // publishVersionedAgenda instead.  We can likely clean this up.

  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const preImportedAgendaUri = await ensureVersionedAgendaForDoc(doc, req.params.kind);
    await publishVersionedAgenda( preImportedAgendaUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    res.send( { success: true } );
  } catch (err) {
    console.log("We had a booboo");
    console.log(JSON.stringify(err));
    res
      .status(400)
      .send( { message: `An error occurred while publishing the agenda ${req.params.documentIdentifier}`,
               err: JSON.stringify(err) } );
  }
} );

/**
 * Makes the current user publish the agenda for the supplied document.
 */
app.post('/signing/notulen/publish/:kind/:documentIdentifier', async function(req, res) {
  // TODO this is 99% the same as
  // /signing/agenda/sign/:kind/:documentIdentifier, it just uses the
  // publishVersionedAgenda instead.  We can likely clean this up.

  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const preImportedAgendaUri = await ensureVersionedNotulenForDoc(doc, req.params.kind);
    await publishVersionedNotulen( preImportedAgendaUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    res.send( { success: true } );
  } catch (err) {
    console.log("We had a booboo");
    console.log(err);
    res
      .status(400)
      .send( { message: `An error occurred while publishing the agenda ${req.params.documentIdentifier}`,
               err: JSON.stringify(err) } );
  }
} );

app.get('/prepublish/agenda/:documentIdentifier', async function(req, res) {
  try {
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const result = await extractAgendaContentFromDoc(doc);
    res.send( { data: { attributes: { content: result }, type: "imported-agenda-contents" } } );
  } catch (err) {

    console.log("We had a booboo");
    console.log(JSON.stringify(err));

    res
      .status(400)
      .send( { message: `An error occurred while fetching contents for prepublished agenda ${req.params.documentIdentifier}`,
               err: JSON.stringify(err) } );
  }
} );

app.get('/prepublish/besluitenlijst/:documentIdentifier', async function(req, res) {
  try {
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const result = extractBesluitenLijstContentFromDoc(doc);
    console.log(result);
    res.send( { data: { attributes: { content: result }, type: "imported-besluitenlijst-contents" } } );
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send( { message: `An error occurred while fetching contents for prepublished notulen ${req.params.documentIdentifier}`,
               err: JSON.stringify(err) } );
  }
});

app.get('/prepublish/notulen/:documentIdentifier', async function(req, res) {
  try {
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const result = await extractNotulenContentFromDoc(doc);
    res.send( { data: { attributes: { content: result }, type: "imported-notulen-contents" } } );
  } catch (err) {

    console.log(err);
    res
      .status(500)
      .send( { message: `An error occurred while fetching contents for prepublished notulen ${req.params.documentIdentifier}`,
               err: JSON.stringify(err) } );
  }
} );

