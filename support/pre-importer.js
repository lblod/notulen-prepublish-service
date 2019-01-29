import mu from 'mu';

import {
  query, update, sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid
} from  'mu';

import { findAllNodesOfType } from '@lblod/marawa/dist/dom-helpers';


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
  // TODO: only create a versioned agenda if none exists yet.

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

async function handleVersionedAgenda( type, versionedAgendaUri, sessionId, targetStatus ) {
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
      ${sparqlEscapeUri(versionedAgendaUri)}
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
        dct:subject ${sparqlEscapeUri(versionedAgendaUri)};
        ${type=='signature'?'ext:signsAgenda':'ext:publishesAgenda'} ${sparqlEscapeUri(versionedAgendaUri)}.
      ${sparqlEscapeUri(versionedAgendaUri)}
        ext:stateString ${sparqlEscapeString(targetStatus)}.
    } WHERE {
      ${sparqlEscapeUri(versionedAgendaUri)}
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
  handleVersionedAgenda( "signature", versionedAgendaUri, sessionId, targetStatus );
}

async function publishVersionedAgenda( versionedAgendaUri, sessionId, targetStatus ) {
  handleVersionedAgenda( "publication", versionedAgendaUri, sessionId, targetStatus );
}

export { extractAgendaContentFromDoc, signVersionedAgenda, publishVersionedAgenda, ensureVersionedAgendaForDoc };
