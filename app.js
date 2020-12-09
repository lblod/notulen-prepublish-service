import { app, errorHandler } from 'mu';
import { getZittingForAgenda} from "./support/agenda-queries";
import {getZittingForBesluitenlijst} from './support/besluit-queries';
import {getZittingForBehandeling} from './support/behandeling-queries';
import {getZittingForNotulen} from './support/notulen-queries';
import { editorDocumentFromUuid } from './support/editor-document';
import { signVersionedAgenda, publishVersionedAgenda, ensureVersionedAgendaForZitting} from './support/agenda-exporter';
import { signVersionedBesluitenlijst, publishVersionedBesluitenlijst, ensureVersionedBesluitenLijstForZitting, buildBesluitenLijstForZitting } from './support/besluit-exporter';
import { extractBehandelingVanAgendapuntenFromZitting, ensureVersionedBehandelingForZitting, isPublished, signVersionedBehandeling, publishVersionedBehandeling } from './support/behandeling-exporter';
import { publishVersionedNotulen, signVersionedNotulen, extractNotulenContentFromZitting, ensureVersionedNotulenForZitting } from './support/notule-exporter';

/***
 *
 *  SIGNING ENDPOINTS
 *
 */

/**
 * Makes the current user sign the agenda for the supplied document.
 * Ensures the prepublished agenda that is signed is persisted in the store and attached to the document container
 */
app.post("/signing/agenda/sign/:kind/:zittingIdentifier", async function (
  req,
  res,
  next
) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting = await getZittingForAgenda(req.params.zittingIdentifier);
    const prepublishedAgendaUri = await ensureVersionedAgendaForZitting(
      zitting,
      req.params.kind
    );
    await signVersionedAgenda(
      prepublishedAgendaUri,
      req.header("MU-SESSION-ID"),
      "eerste handtekening"
    );
    return res.send({success: true}).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(
      `An error occurred while signing the agenda ${
        req.params.documentIdentifier
      }: ${JSON.stringify(err)}`
    );
    return next(error);
  }
});

/**
 * Makes the current user sign the besluitenlijst for the supplied document.
 * Ensures the prepublished besluitenlijst that is signed is persisted in the store and attached to the document container
 */
app.post('/signing/besluitenlijst/sign/:zittingIdentifier', async function(req, res, next) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting = await getZittingForBesluitenlijst(req.params.zittingIdentifier);
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(zitting);
    await signVersionedBesluitenlijst( prepublishedBesluitenlijstUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(`An error occurred while signing the besluitenlijst ${req.params.documentIdentifier}: ${JSON.stringify(err)}`);
    return next(error);
  }
});


/**
 * Makes the current user sign the provided behandeling for the supplied document.
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
app.post('/signing/behandeling/sign/:zittingIdentifier/:behandelingUuid', async function(req, res, next) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting =  await getZittingForBehandeling(req.params.zittingIdentifier);
    const behandelingUuid = decodeURIComponent(req.params.behandelingUuid);
    const prepublishedBehandelingUri = await ensureVersionedBehandelingForZitting(zitting, behandelingUuid);
    console.log(prepublishedBehandelingUri);
    await signVersionedBehandeling( prepublishedBehandelingUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while signing the behandeling ${req.params.behandelingUuid}: ${JSON.stringify(err)}`);
    return next(error);
  }
});

/**
 * Makes the current user sign the notulen for the supplied document.
 * Ensures the prepublished notulen that are signed are persisted in the store and attached to the document container
 */
app.post('/signing/notulen/sign/:zittingIdentifier', async function(req, res, next) {
  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting = await getZittingForNotulen( req.params.zittingIdentifier );
    const prepublishedNotulenUri = await ensureVersionedNotulenForZitting(zitting, 'publication');
    await signVersionedNotulen( prepublishedNotulenUri, req.header("MU-SESSION-ID"), "eerste handtekening" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(`An error occurred while signing the notulen ${req.params.zittingIdentifier}: ${JSON.stringify(err)}`);
    return next(error);
  }
});


/***
 *
 *  PUBLICATION ENDPOINTS
 *
 */

/**
 * Makes the current user publish the agenda for the supplied document.
 * Ensures the prepublished agenda that is signed is persisted in the store and attached to the document container
 */
app.post('/signing/agenda/publish/:kind/:zittingIdentifier', async function(req, res, next) {
  // TODO this is 99% the same as
  // /signing/agenda/sign/:kind/:documentIdentifier, it just uses the
  // publishVersionedAgenda instead.  We can likely clean this up.

  try {
    // TODO: we now assume this is the first signature.  we should
    // check and possibly support the second signature.
    const zitting = await getZittingForAgenda(req.params.zittingIdentifier);
    const prepublishedAgendaUri = await ensureVersionedAgendaForZitting(
        zitting,
        req.params.kind
    );
    await publishVersionedAgenda(
        prepublishedAgendaUri,
        req.header("MU-SESSION-ID"),
        "gepubliceerd"
    );
    return res.send({success: true}).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(
        `An error occurred while publishing the agenda ${
            req.params.zittingIdentifier
        }: ${JSON.stringify(err)}`
    );
    return next(error);
  }
} );

/**
 * Makes the current user publish the besluitenlijst for the supplied document.
 * Ensures the prepublished besluitenlijst that is signed is persisted in the store and attached to the document container
 */
app.post('/signing/besluitenlijst/publish/:zittingIdentifier', async function(req, res, next) {
  // TODO this is 99% the same as
  // /signing/besluitenlijst/sign/:kind/:documentIdentifier, it just uses the
  // publishVersionedBesluitenlijst instead.  We can likely clean this up.

  try {
    const zitting = await getZittingForBesluitenlijst(req.params.zittingIdentifier);
    const prepublishedBesluitenlijstUri = await ensureVersionedBesluitenLijstForZitting(zitting);
    await publishVersionedBesluitenlijst( prepublishedBesluitenlijstUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(`An error occurred while published the besluitenlijst ${req.params.zittingIdentifier}: ${JSON.stringify(err)}`);
    return next(error);
  }
} );


/**
 * Makes the current user publish the provided behandeling for the supplied document.
 * Ensures the prepublished behandeling that is signed is persisted in the store and attached to the document container
 */
app.post('/signing/behandeling/publish/:zittingIdentifier/:behandelingUuid', async function(req, res, next) {
  try {
    const zitting =  await getZittingForBehandeling(req.params.zittingIdentifier);
    const behandelingUuid = decodeURIComponent(req.params.behandelingUuid);
    const prepublishedBehandelingUri = await ensureVersionedBehandelingForZitting(zitting, behandelingUuid);
    await publishVersionedBehandeling( prepublishedBehandelingUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(err);
    const error = new Error(`An error occurred while publishing the behandeling ${req.params.zittingIdentifier}: ${JSON.stringify(err)}`);
    return next(error);
  }
});

/**
 * Makes the current user publish the notulen for the supplied document as well as the un-published uittreksels.
 * Ensures the prepublished notulen that are signed are persisted in the store and attached to the document container
 */
app.post('/signing/notulen/publish/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForNotulen( req.params.zittingIdentifier );
    const publicBehandelingUris = req.body['public-behandeling-uris'];
    const zittingForBehandeling =  await getZittingForBehandeling(req.params.zittingIdentifier);
    for(let agendapunt of zitting.agendapunten) {
      if(publicBehandelingUris.includes(agendapunt.behandeling.uri)) {
        const isBehandelingPublished = await isPublished(agendapunt.behandeling.uri);
        if(!isBehandelingPublished) {
          const prepublishedBehandelingUri = await ensureVersionedBehandelingForZitting(zittingForBehandeling, agendapunt.behandeling.uuid);
          await publishVersionedBehandeling( prepublishedBehandelingUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
        }
      }
    }
    const prepublishedNotulenUri = await ensureVersionedNotulenForZitting(zitting, 'publication', publicBehandelingUris);
    await publishVersionedNotulen( prepublishedNotulenUri, req.header("MU-SESSION-ID"), "gepubliceerd" );
    return res.send( { success: true } ).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(`An error occurred while published the notulen ${req.params.zittingIdentifier}: ${JSON.stringify(err)}`);
    return next(error);
  }
} );


/***
 *
 * PREPUBLICATION ENDPOINTS
 *
 */

/**
* Prepublish an agenda as HTML+RDFa snippet for a given document
* The snippet is not persisted in the store
*/
app.get("/prepublish/agenda/:zittingIdentifier", async function (
  req,
  res,
  next
) {
  try {
    const zitting = await getZittingForAgenda(req.params.zittingIdentifier);
    const result = await buildAgendaContentFromZitting(zitting);
    return res
      .send({
        data: {attributes: {content: result}, type: "imported-agenda-contents"},
      })
      .end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(
      `An error occurred while fetching contents for prepublished agenda ${
        req.params.zittingIdentifier
      }: ${JSON.stringify(err)}`
    );
    error.status = 500;
    return next(error);
  }
});

/**
* Prepublish a besluitenlijst as HTML+RDFa snippet for a given document
* The snippet is not persisted in the store
*/
app.get('/prepublish/besluitenlijst/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForBesluitenlijst(req.params.zittingIdentifier);
    const besluitenlijst = await buildBesluitenLijstForZitting(zitting);
    return res.send( { data: { attributes: { content: besluitenlijst }, type: "imported-besluitenlijst-contents" } } ).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(`An error occurred while fetching contents for prepublished besluitenlijst ${req.params.zittingIdentifier}: ${JSON.stringify(err)}`);
    error.status = 500;
    return next(error);
  }
});

/**
 * Prepublish besluiten as HTML+RDFa snippet for a given document
 * The snippets are not persisted in the store
 */
app.get('/prepublish/behandelingen/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForBehandeling(req.params.zittingIdentifier);
    const behandeling = await extractBehandelingVanAgendapuntenFromZitting(zitting);
    return res.send(behandeling).end();
  }
  catch (err) {
    console.log(err);
    const error = new Error(`An error occured while fetching contents for prepublished besluiten ${req.params.documentIdentifier}: ${JSON.stringify(err)}`);
    error.status = 500;
    return next(error);
  }
});

/**
 * Prepublish besluiten for notulen as HTML+RDFa snippet for a given document
 * The snippets are not persisted in the store
 */
app.get('/prepublish/notulen/behandelingen/:documentIdentifier', async function(req, res, next) {
  try {
    const doc = await editorDocumentFromUuid( req.params.documentIdentifier );
    const results = (await extractBehandelingVanAgendapuntenFromDoc(doc, false)).map((r) => {
      return { attributes: r, type: "imported-behandeling-contents" };
    });
    return res.send({ data: results }).end();
  }
  catch (err) {
    console.log(err);
    const error = new Error(`An error occured while fetching contents for prepublished notulen besluiten ${req.params.documentIdentifier}: ${JSON.stringify(err)}`);
    error.status = 500;
    return next(error);
  }
});

/**
* Prepublish notulen as HTML+RDFa snippet for a given document
* The snippet is not persisted in the store
*/
app.get('/prepublish/notulen/:zittingIdentifier', async function(req, res, next) {
  try {
    const zitting = await getZittingForNotulen( req.params.zittingIdentifier );
    const result = await extractNotulenContentFromZitting(zitting);
    return res.send( { data: { attributes: { content: result }, type: "imported-notulen-contents" } } ).end();
  } catch (err) {
    console.log(JSON.stringify(err));
    const error = new Error(`An error occurred while fetching contents for prepublished notulen ${req.params.zittingIdentifier}: ${JSON.stringify(err)}`);
    error.status = 500;
    return next(error);
  }
});

app.use(errorHandler);
