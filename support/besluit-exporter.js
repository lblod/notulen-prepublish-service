import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import {wrapZittingInfo, handleVersionedResource, cleanupTriples, hackedSparqlEscapeString} from './pre-importer';
import {findFirstNodeOfType, findAllNodesOfType} from '@lblod/marawa/dist/dom-helpers';
import { analyse, resolvePrefixes } from '@lblod/marawa/dist/rdfa-context-scanner';

/**
 * Extracts the besluitenlijst from the supplied document.
 * Returns an HTML+RDFa snippet containing the zitting with its behandeling van agendapunten and generated besluiten
 * Besluitenlijst == titel & korte beschrijving
 */
function extractBesluitenLijstContentFromDoc( doc, agendapunt, openbaar, behandeling ) {
  const contexts = analyse( doc.getTopDomNode() ).map((c) => c.context);
  const triples = cleanupTriples(Array.concat(...contexts));
  const besluiten = triples.filter((t) => t.predicate === "a" && t.object === "http://data.vlaanderen.be/ns/besluit#Besluit").map( (b) => b.subject);
  var besluitenHTML = '';
  for (const besluit of besluiten) {
    const title = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#title' && t.subject === besluit);
    const description = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#description' && t.subject === besluit);
    const gebeurtNa = triples.find((t) => t.predicate === 'http://data.vlaanderen.be/ns/besluit#gebeurtNa' && t.subject === behandeling.subject);
    const besluitTypes = triples.filter((t) => t.predicate === "a" && t.subject === besluit).map(type => type.object);
    var besluitHTML = `<h3 class="h4" property="eli:title">${title ? title.object : ''}</h3><p property="eli:description">${description ? description.object : ''}</p>`;
    besluitHTML = `<div resource="${behandeling}" typeof="besluit:BehandelingVanAgendapunt">
                      ${ agendapunt ? `<span property="http://purl.org/dc/terms/subject" resource="${agendapunt}" > </span>` : ''}
                      ${ openbaar ? `<span property="besluit:openbaar" datatype="xsd:boolean" content="${openbaar}" class="annotation--agendapunt--${ openbaar === "true"  ? "open" : "closed"}__icon"><i class="fa fa-eye${ openbaar === "true" ? "" : "-slash"}"> </i></span>` : ''}
                      ${ gebeurtNa ? `<span property="besluit:gebeurtNa" resource="${gebeurtNa.object}"> </span>` : ''}
                      <div property="prov:generated" resource="${besluit}" typeof="${besluitTypes.join(' ')}">
                      ${besluitHTML}
                      </div>
                    </div>`;
    besluitenHTML = `${besluitenHTML}${besluitHTML}`;
  }

  // TODO add helper function for prefixes
  var prefix = "";
  for( var key of Object.keys(doc.context.prefix) )
    prefix += `${key}: ${doc.context.prefix[key]} `;
  return `<div class="besluiten" prefix="${prefix}">${wrapZittingInfo(doc, besluitenHTML)}</div>`;
}

/**
 * Creates a versioned besluitenlijst item in the triplestore which could be signed.
 * The versioned besluitenlijst are attached to the document container.
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
    console.log(`Creating a new versioned besluitenlijst for ${doc.uri}`);
    const besluitenLijstContent = await extractBesluitenLijstContentFromDoc( doc );
    const besluitenLijstUuid = uuid();
    const besluitenLijstUri = `http://data.lblod.info/prepublished-besluiten-lijsten/${besluitenLijstUuid}`;

    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(besluitenLijstUri)}
           a ext:VersionedBesluitenLijst;
           ext:content ${hackedSparqlEscapeString( besluitenLijstContent )};
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
