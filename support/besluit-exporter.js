import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import {wrapZittingInfo, handleVersionedResource, cleanupTriples} from './pre-importer';
import {findFirstNodeOfType, findAllNodesOfType} from '@lblod/marawa/dist/dom-helpers';
import { analyse, resolvePrefixes } from '@lblod/marawa/dist/rdfa-context-scanner';


/**
 * Extracts the besluitenlijst from the supplied document.
 * besluitenlijst == titel & korte beschrijving
 */
function extractBesluitenLijstContentFromDoc( doc ) {
  // Find all agendapunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
  const node = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );
  if (node){
    const contexts = analyse( node ).map((c) => c.context);
    const triples = cleanupTriples(Array.concat(...contexts));
    const besluiten = triples.filter((t) => t.predicate === "a" && t.object === "http://data.vlaanderen.be/ns/besluit#Besluit").map( (b) => b.subject);
    var besluitenHTML = '';
    for (const besluit of besluiten) {
      const title = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#title' && t.subject === besluit);
      const description = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#description' && t.subject === besluit);
      const behandeling = triples.find((t) => t.predicate === 'http://www.w3.org/ns/prov#generated' && t.object === besluit);
      const agendapunt = triples.find((t) => t.predicate === 'http://purl.org/dc/terms/subject' && t.object === behandeling.subject);
      const openbaar = triples.find((t) => t.predicate === 'http://data.vlaanderen.be/ns/besluit#openbaar' && t.object === behandeling.subject);
      var besluitHTML = `<h3 class="h4" property="eli:title">${title ? title.object : ''}</h3><p property="eli:description">${description ? description.object : ''}</p>`;
      if (behandeling) {
        besluitHTML = `<div resource="${behandeling.subject}" typeof="besluit:BehandelingVanAgendapunt">
                          ${ agendapunt ? `<span property="dct:subject" resource="${agendapunt.object}" ></span>` : ''}
                          ${ openbaar ? `<span property="besluit:openbaar" datatype="xsd:boolean" content="${openbaar.object}" class="annotation--agendapunt--${ openbaar.object === "true"  ? "open" : "closed"}__icon"><i class="fa fa-eye-slash"></i></span>` : ''}
                          <div property="prov:generated" resource="${besluit}" typeof="http://data.vlaanderen.be/ns/besluit#Besluit">
                          ${besluitHTML}
                          </div>
                       </div>`;
      }
      else {
        besluitHTML = `<div resource="${besluit}" typeof="http://data.vlaanderen.be/ns/besluit#Besluit">${besluitHTML}</div>`;
      }
      besluitenHTML = `${besluitenHTML}${besluitHTML}`;
    }
  }
  var prefix = "";
  for( var key of Object.keys(doc.context.prefix) )
    prefix += `${key}: ${doc.context.prefix[key]} `;
  return `<div class="besluiten" prefix="${prefix}">${wrapZittingInfo(doc, besluitenHTML)}</div`;
}


/**
 * Creates an agenda item in the triplestore which could be signed.
 */
async function ensureVersionedBesluitenLijstForDoc( doc ) {
  // TODO remove (or move) relationship between previously signable
  // besluitenLijst, and the current besluitenLijst.

  const previousId = await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>

    SELECT ?besluitenLijstUri
    WHERE {
      ?besluitenLijstUri
         a ext:VersionedBesluitenLijst;
         prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)}.
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedBesluitenLijstId = previousId.results.bindings[0].besluitenLijstUri.value;
    console.log(`Reusing versioned besluitenlijst ${versionedBesluitenLijstId}`);
    return versionedBesluitenLijstId;
  } else {
    console.log("Creating new VersionedBesluitenLijst");
    // Find all besluitenLijstpunt nodes, wrap them in a separate node, and push the information onto the DocumentContainer
    const besluitenLijstContent = await extractBesluitenLijstContentFromDoc( doc );
    const besluitenLijstUuid = uuid();
    const besluitenLijstUri = `http://lblod.info/prepublished-besluitenLijsts/${besluitenLijstUuid}`;

    // Create the new prepublished besluitenLijst, and dump it in to the store
    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(besluitenLijstUri)}
           a ext:VersionedBesluitenLijst;
           ext:content ${sparqlEscapeString( besluitenLijstContent )};
           prov:wasDerivedFrom ${sparqlEscapeUri(doc.uri)};
           mu:uuid ${sparqlEscapeString( besluitenLijstUuid )}.
        ?documentContainer ext:hasVersionedBesluitenLijst ${sparqlEscapeUri(besluitenLijstUri)}.
      } WHERE {
        ${sparqlEscapeUri(doc.uri)} ^pav:hasVersion ?documentContainer;
                                    ext:editorDocumentContext ?context.
      }`);

    return besluitenLijstUri;
  }
};

async function signVersionedBesluitenlijst( versionedBesluitenLijstUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedBesluitenLijstUri, sessionId, targetStatus, 'ext:signsBesluitenlijst');
}

async function publishVersionedBesluitenlijst( versionedBesluitenLijstUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedBesluitenLijstUri, sessionId, targetStatus, 'ext:publishesBesluitenlijst');
}


export { extractBesluitenLijstContentFromDoc, signVersionedBesluitenlijst, publishVersionedBesluitenlijst, ensureVersionedBesluitenLijstForDoc };
