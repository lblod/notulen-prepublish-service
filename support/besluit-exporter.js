// @ts-ignore
import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import {handleVersionedResource, cleanupTriples, hackedSparqlEscapeString} from './pre-importer';
import { analyse } from '@lblod/marawa/dist/rdfa-context-scanner';
import { editorDocumentFromUuid } from './editor-document';
import * as path from "path";
import * as fs from "fs";
import Handlebars from "handlebars";
import {prefixes} from "./prefixes";




async function buildBesluitenLijstForZitting(zitting) {
  const agendapunten = zitting.agendapunten;
  const besluiten = [];
  for(let agendapunt of agendapunten) {
    const behandeling = agendapunt.behandeling;
    if(!behandeling.documentUuid) continue
    const doc = await editorDocumentFromUuid( behandeling.documentUuid );
    if(!doc) continue
    const besluit = extractBesluitenFromDoc(doc, agendapunt.uri, agendapunt.geplandOpenbaar, behandeling.uri, behandeling.stemmingen);
    besluiten.push(besluit);
  }
  debugger;
  return wrapZittingInfo(besluiten, zitting);
}

function extractBesluitenFromDoc( doc, agendapunt, openbaar, behandeling, stemmingen) {
    var besluitenBuffer=[];
    const contexts = analyse( doc.getTopDomNode() ).map((c) => c.context);
    const triples = cleanupTriples(Array.concat(...contexts));
    const besluiten = triples.filter((t) => t.predicate === "a" && t.object === "http://data.vlaanderen.be/ns/besluit#Besluit").map( (b) => b.subject);
    debugger;
    for (const besluit of besluiten) {
      const title = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#title' && t.subject === besluit);
      const description = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#description' && t.subject === besluit);
      const gebeurtNa = triples.find((t) => t.predicate === 'http://data.vlaanderen.be/ns/besluit#gebeurtNa' && t.subject === behandeling.subject);
      const besluitTypes = triples.filter((t) => t.predicate === "a" && t.subject === besluit).map(type => type.object);      
      besluitenBuffer.push({
        title: title,
        description: description,
        behandeling: behandeling,
        agendapunt: agendapunt,
        openbaar: openbaar,
        gebeurtNa: gebeurtNa,
        besluit: besluit,
        besluitTypes: besluitTypes.join(' '),
        stemmingen: stemmingen,
      });
      debugger;
    }
    return besluitenBuffer;
  }

  async function wrapZittingInfo(besluitenlijst, zitting) {
    const templateStr = fs
      .readFileSync(path.join(__dirname, "templates/besluitenlijst-prepublish.hbs"))
      .toString();
    const template = Handlebars.compile(templateStr);
    const output=template({besluitenlijst, zitting, prefixes: prefixes.join(" ")});
    debugger;
    return output;
  }






/**
 * Extracts the besluiten from the supplied document.
 * Returns an HTML+RDFa snippet containing the behandeling van agendapunten and generated besluiten
 */
// function extractBesluitenFromDoc( doc, agendapunt, openbaar, behandeling, stemmingen) {
//   const contexts = analyse( doc.getTopDomNode() ).map((c) => c.context);
//   const triples = cleanupTriples(Array.concat(...contexts));
//   const besluiten = triples.filter((t) => t.predicate === "a" && t.object === "http://data.vlaanderen.be/ns/besluit#Besluit").map( (b) => b.subject);
//   var besluitenHTML = '';
//   for (const besluit of besluiten) {
//     const title = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#title' && t.subject === besluit);
//     const description = triples.find((t) => t.predicate === 'http://data.europa.eu/eli/ontology#description' && t.subject === besluit);
//     const gebeurtNa = triples.find((t) => t.predicate === 'http://data.vlaanderen.be/ns/besluit#gebeurtNa' && t.subject === behandeling.subject);
//     const besluitTypes = triples.filter((t) => t.predicate === "a" && t.subject === besluit).map(type => type.object);
    
    
//     var besluitHTML = `<h3 class="h4" property="eli:title">${title ? title.object : ''}</h3><p property="eli:description">${description ? description.object : ''}</p>`;
    
//     besluitHTML+=`<h3 class="h4">Stemmingen</h3>`;
//     for(let i=0; i<stemmingen.length; i++){
//       besluitHTML+=`
//       <div typeof="http://data.vlaanderen.be/ns/besluit#Stemming" resource=${stemmingen[i].stemmingUri.value} property="besluit:heeftStemming">
//       <p><strong>Onderwerp:</strong> <span property="besluit:onderwerp">${stemmingen[i].onderwerp.value}</span>, <strong>Gevolg:</strong> <span property="besluit:gevolg">${stemmingen[i].gevolg.value}</span></p>
//       </div>`
//     }

//     besluitHTML = `<div resource="${behandeling}" typeof="besluit:BehandelingVanAgendapunt">
//                       ${ agendapunt ? `<span property="http://purl.org/dc/terms/subject" resource="${agendapunt}" > </span>` : ''}
//                       ${ openbaar ? `<span property="besluit:openbaar" datatype="xsd:boolean" content="${openbaar}" class="annotation--agendapunt--${ openbaar === "true"  ? "open" : "closed"}__icon"><i class="fa fa-eye${ openbaar === "true" ? "" : "-slash"}"> </i></span>` : ''}
//                       ${ gebeurtNa ? `<span property="besluit:gebeurtNa" resource="${gebeurtNa.object}"> </span>` : ''}
//                       <div property="prov:generated" resource="${besluit}" typeof="${besluitTypes.join(' ')}">
//                       ${besluitHTML}
//                       </div>
//                     </div>`;
//     besluitenHTML = `${besluitenHTML}${besluitHTML}`;
//   }
//   return besluitenHTML;
// }

// async function buildBesluitenLijstForZitting(zitting) {
//   const agendapunten = zitting.agendapunten;
//   const besluiten = [];
//   for(let agendapunt of agendapunten) {
//     const behandeling = agendapunt.behandeling;
//     if(!behandeling.documentUuid) continue
//     const doc = await editorDocumentFromUuid( behandeling.documentUuid );
//     if(!doc) continue
//     const besluit = extractBesluitenFromDoc(doc, agendapunt.uri, agendapunt.geplandOpenbaar, behandeling.uri, behandeling.stemmingen);
//     besluiten.push(besluit);
//   }
//   return wrapZittingInfo(besluiten.join(''), zitting);
// }

// async function wrapZittingInfo(besluitenlijst, zitting) {
//   const templateStr = fs
//     .readFileSync(path.join(__dirname, "templates/besluitenlijst-prepublish.hbs"))
//     .toString();
//   const template = Handlebars.compile(templateStr);
//   return template({besluitenlijst, zitting, prefixes: prefixes.join(" ")});
// }

/**
 * Creates a versioned besluitenlijst item in the triplestore which could be signed.
 * The versioned besluitenlijst are attached to the document container.
 */
async function ensureVersionedBesluitenLijstForZitting( zitting ) {
  // TODO remove (or move) relationship between previously signable
  // besluitenLijst, and the current besluitenLijst.

  const previousId = await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>

    SELECT ?besluitenLijstUri
    WHERE {
      ?besluitenLijstUri
        a ext:VersionedBesluitenLijst.
      ${sparqlEscapeUri(zitting.uri)} besluit:heeftBesluitenlijst ?besluitenLijstUri
    } LIMIT 1`);

  if( previousId.results.bindings.length ) {
    const versionedBesluitenLijstId = previousId.results.bindings[0].besluitenLijstUri.value;
    console.log(`Reusing versioned besluitenlijst ${versionedBesluitenLijstId}`);
    return versionedBesluitenLijstId;
  } else {
    console.log(`Creating a new versioned besluitenlijst for ${zitting.uri}`);
    const besluitenLijstContent = await buildBesluitenLijstForZitting( zitting );
    debugger;
    const besluitenLijstUuid = uuid();
    const besluitenLijstUri = `http://data.lblod.info/besluiten-lijsten/${besluitenLijstUuid}`;

    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>

      INSERT DATA{
        ${sparqlEscapeUri(besluitenLijstUri)}
          a ext:VersionedBesluitenLijst;
          ext:content ${hackedSparqlEscapeString( besluitenLijstContent )};
          mu:uuid ${sparqlEscapeString( besluitenLijstUuid )}.
        ${sparqlEscapeUri(zitting.uri)} besluit:heeftBesluitenlijst ${sparqlEscapeUri(besluitenLijstUri)}.
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


export { extractBesluitenFromDoc, signVersionedBesluitenlijst, publishVersionedBesluitenlijst, ensureVersionedBesluitenLijstForZitting, buildBesluitenLijstForZitting };
