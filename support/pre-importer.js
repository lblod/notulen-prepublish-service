import mu from 'mu';

import {query, update} from 'mu';
import {sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid} from  'mu';

import { findAllNodesOfType } from '@lblod/marawa/dist/dom-helpers';
import { extractNotulenContentFromDoc } from './notule-exporter';


/**
 * Extracts the Agenda's content from the supplied document.
 */
async function extractAgendaContentFromDoc( doc ) {
  // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
  const agendapuntNodes = findAllNodesOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Agendapunt' );
  return `<div class="agendapunten">${agendapuntNodes.map( (n) => n.outerHTML ).join("\n")}</div>`;
}

/**
 * Creates an agenda item in the triplestore which could be signed.
 */
async function ensureVersionedAgendaForDoc( doc, agendaKind ) {
  // TODO remove (or move) relationship between previously signable
  // agenda, and the current agenda.

  const previousId = await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>

    SELECT ?agendaUri
    WHERE {
      ?agendaUri
         a ext:VersionedAgenda;
         prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
         ext:agendaKind ${sparqlEscapeString( agendaKind )}.
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedAgendaId = previousId.results.bindings[0].agendaUri.value;
    console.log(`Reusing versioned agenda ${versionedAgendaId}`);
    return versionedAgendaId;
  } else {
    console.log("Creating new VersionedAgenda");
    // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
    const agendaContent = await extractAgendaContentFromDoc( doc );
    const agendaUuid = uuid();
    const agendaUri = `http://lblod.info/prepublished-agendas/${agendaUuid}`;

    // Create the new prepublished agenda, and dump it in to the store
    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(agendaUri)}
           a ext:VersionedAgenda;
           ext:content ${sparqlEscapeString( agendaContent )};
           prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
           mu:uuid ${sparqlEscapeString( agendaUuid )};
           ext:agendaKind ${sparqlEscapeString( agendaKind )}.
        ?documentContainer ext:hasVersionedAgenda ${sparqlEscapeUri(agendaUri)}.
      } WHERE {
        ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                    ext:editorDocumentContext ?context.
      }`);

    return agendaUri;
  }
};

function customEscapeString(string) {
  return `""${sparqlEscapeString(string.replace(/\n/g, function(match) { return '' }).replace(/\r/g, function(match) { return ''}))}""`;
}

/**
 * Creates an notulen item in the triplestore which could be signed.
 */
async function ensureVersionedNotulenForDoc( doc, notulenKind ) {
  // TODO remove (or move) relationship between previously signable
  // notulen, and the current notulen.

  const previousId = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>

    SELECT ?notulenUri
    WHERE {
      ?notulenUri
         a ext:VersionedNotulen;
         prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
         ext:notulenKind ${sparqlEscapeString( notulenKind )}.
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedNotulenId = previousId.results.bindings[0].notulenUri.value;
    console.log(`Reusing versioned notulen ${versionedNotulenId}`);
    return versionedNotulenId;
  } else {
    console.log("Creating new VersionedNotulen");
    // Find all notulenpunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
    const notulenContent = await extractNotulenContentFromDoc( doc );
    const notulenUuid = uuid();
    const notulenUri = `http://lblod.info/prepublished-notulens/${notulenUuid}`;

    // Create the new prepublished notulen, and dump it in to the store
    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(notulenUri)}
           a ext:VersionedNotulen;
           ext:content ${customEscapeString(notulenContent)};
           prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
           mu:uuid ${sparqlEscapeString( notulenUuid )};
           ext:notulenKind ${sparqlEscapeString( notulenKind )}.
        ?documentContainer ext:hasVersionedNotulen ${sparqlEscapeUri(notulenUri)}.
      } WHERE {
        ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                    ext:editorDocumentContext ?context.
      }`);

    return notulenUri;
  }
};
async function handleVersionedResource( type, versionedUri, sessionId, targetStatus, customSignaturePredicate ) {
  const newResourceUuid = uuid();
  const resourceType = type == 'signature' ? "sign:SignedResource" : "sign:PublishedResource";
  const newResourceUri = `http://lblod.info/${type == 'signature' ? "signed-resources" : "published-resources"}/${newResourceUuid}`;

  // TODO: get correct signatorySecret from ACMIDM

  const query = `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX sign: <http://mu.semte.ch/vocabularies/ext/signing/>
    PREFIX publicationStatus: <http://mu.semte.ch/vocabularies/ext/signing/publication-status/>
    PREFIX muSession: <http://mu.semte.ch/vocabularies/session/>
    PREFIX dct: <http://purl.org/dc/terms/>

    DELETE {
      ${sparqlEscapeUri(versionedUri)}
        ext:stateString ?state.
    } INSERT {
      ${sparqlEscapeUri(newResourceUri)}
        a ${resourceType};
        mu:uuid ${sparqlEscapeString(newResourceUuid)};
        sign:text ?content;
        sign:signatory ?userUri;
        sign:signatoryRoles ?signatoryRole;
        dct:created ${sparqlEscapeDateTime(new Date())};
        sign:signatorySecret ?signatorySecret;
        sign:status publicationStatus:unpublished;
        ${customSignaturePredicate ? `${customSignaturePredicate} ${sparqlEscapeUri(versionedUri)};` : ''}
        dct:subject ${sparqlEscapeUri(versionedUri)}.
      ${sparqlEscapeUri(versionedUri)}
        ext:stateString ${sparqlEscapeString(targetStatus)}.
    } WHERE {
      ${sparqlEscapeUri(versionedUri)}
        ext:content ?content.
      ${sparqlEscapeUri(sessionId)}
        muSession:account/^foaf:account ?userUri.
      ${sparqlEscapeUri(sessionId)}
        ext:sessionRole ?signatoryRole.
      BIND ("helloworldsecretbehere" AS ?signatorySecret)
    }`;

  const updatePromise = await update( query );
  return updatePromise;
};

async function signVersionedAgenda( versionedAgendaUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedAgendaUri, sessionId, targetStatus, 'ext:signsAgenda');
}

async function publishVersionedAgenda( versionedAgendaUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedAgendaUri, sessionId, targetStatus, 'ext:publishesAgenda');
}


async function signVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedNotulenUri, sessionId, targetStatus, 'ext:signsNotulen');
}

async function publishVersionedNotulen( versionedNotulenUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedNotulenUri, sessionId, targetStatus, 'ext:publishesNotulen');
}


export {
  extractAgendaContentFromDoc,
  signVersionedAgenda,
  publishVersionedAgenda,
  signVersionedNotulen,
  publishVersionedNotulen,
  ensureVersionedAgendaForDoc,
  ensureVersionedNotulenForDoc
};
