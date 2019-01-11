import mu from 'mu';

import {
  query, update, sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid
} from  'mu';

import { findAllNodesOfType } from './dom-helpers';

function hackedSparqlEscapeString( string ) {
  return '"""' + string.replace(/[\\"']/g, function(match) { return '\\' + match; }) + '"""';
};

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
async function ensureVersionedAgendaForDoc( doc ) {
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
         prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)}.
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedAgendaId = previousId.results.bindings[0].agendaUri.value;
    return versionedAgendaId;
  } else {
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
           ext:content ${hackedSparqlEscapeString( agendaContent )};
           prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
           mu:uuid ${hackedSparqlEscapeString( agendaUuid )}.
        ?documentContainer ext:hasVersionedAgenda ${sparqlEscapeUri(agendaUri)}.
      } WHERE {
        ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                    ext:editorDocumentContext ?context.
      }`);

    return agendaUri;
  }
};

async function signVersionedAgenda( versionedAgendaUri, sessionId, targetStatus ) {
  const signedResourceUuid = uuid();
  const signedResourceUri = `http://lblod.info/signed-resources/${signedResourceUuid}`;

  // TODO: get correct signatorySecret from ACMIDM

  const query = `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX sign: <http://mu.semte.ch/vocabularies/ext/signing/>
    PREFIX publicationStatus: <http://mu.semte.ch/vocabularies/ext/signing/publication-status/>
    PREFIX muSession: <http://mu.semte.ch/vocabularies/session/>
    PREFIX dct: <http://purl.org/dc/terms/>

    DELETE {
      ${sparqlEscapeUri(versionedAgendaUri)}
        ext:stateString ?state.
    } INSERT {
      ${sparqlEscapeUri(signedResourceUri)}
        a sign:SignedResource;
        sign:text ?content;
        sign:signatory ?userUri;
        sign:signatoryRoles ?signatoryRole;
        dct:created ${sparqlEscapeDateTime(new Date())};
        sign:signatorySecret ?signatorySecret;
        sign:status publicationStatus:unpublished;
        dct:subject ${sparqlEscapeUri(versionedAgendaUri)}.
      ${sparqlEscapeUri(versionedAgendaUri)}
        ext:stateString ${hackedSparqlEscapeString(targetStatus)}.
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

export { extractAgendaContentFromDoc, signVersionedAgenda, ensureVersionedAgendaForDoc };
