import { app, uuid } from 'mu';

import { editorDocumentFromUuid } from './support/editor-document';

import { importAgendaFromDoc } from './support/agenda-exporter';
        

import { importNotuleFromDoc,
         importDecisionsFromDoc
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

app.post('/publish/notule/:documentIdentifier', async function(req, res) {
  try {
    const documentId = req.params.documentIdentifier;
    const doc = await editorDocumentFromUuid( documentId );
    await importNotuleFromDoc( doc.getTopDomNode(), doc.getDom(), doc );

    doc.resetDom();
    await importDecisionsFromDoc( doc.getTopDomNode(), doc.getDom() );
    res.send( { success: true } );
  } catch (err) {
    res
      .status(400)
      .send( { message: `An error occurred while publishing minutes for ${req.params.documentIdentifier}`,
               err: JSON.stringify( err ) } );
  }
});
