import { app, uuid } from 'mu';

import { editorDocumentFromUuid } from './support/editor-document';

import { importAgendaFromDoc } from './support/agenda-exporter';
import { signVersionedAgenda, preImportAgendaFromDoc, extractAgendaContentFromDoc } from './support/pre-importer';

import { importCoreNotuleFromDoc,
         importDecisionsFromDoc,
         importFullNotuleFromDoc
       } from './support/notule-exporter';

app.post('/publish/agenda/:documentIdentifier', async function(req, res) {
  try {
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    await importAgendaFromDoc(doc);
    res.send( { success: true } );

  } catch (err) {
    res
      .status(400)
      .send( { message: `An error occurred while publishing agenda ${req.params.documentIdentifier}`,
               err: JSON.stringify(err) } );
  }
} );

/**
 * Makes the current user sign the agenda for the supplied document.
 */
app.post('/signing/agenda/sign/:documentIdentifier', async function(req, res) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const preImportedAgendaUri = await preImportAgendaFromDoc(doc);
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


app.post('/publish/decision/:documentIdentifier', async function(req, res) {
  try {
    const documentId = req.params.documentIdentifier;
    const doc = await editorDocumentFromUuid( documentId );
    await importCoreNotuleFromDoc( doc.getTopDomNode(), doc.getDom(), doc );

    doc.resetDom();
    await importDecisionsFromDoc( doc.getTopDomNode(), doc.getDom() );
    res.send( { success: true } );
  } catch (err) {
    res
      .status(400)
      .send( { message: `An error occurred while publishing decisions for ${req.params.documentIdentifier}`,
               err: JSON.stringify( err ) } );
  }
});

app.post('/publish/notule/:documentIdentifier', async function(req, res) {
  try {
    const documentId = req.params.documentIdentifier;
    const doc = await editorDocumentFromUuid( documentId );
    await importFullNotuleFromDoc( doc.getTopDomNode(), doc.getDom(), doc );
    res.send( { success: true } );
  } catch (err) {
    res
      .status(400)
      .send( { message: `An error occurred while publishing minutes for ${req.params.documentIdentifier}`,
               err: JSON.stringify( err ) } );
  }
} );
