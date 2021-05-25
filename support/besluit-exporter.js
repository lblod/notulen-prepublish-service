// @ts-ignore
import { update, query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import {handleVersionedResource, cleanupTriples, hackedSparqlEscapeString} from './pre-importer';
import { analyse } from '@lblod/marawa/rdfa-context-scanner';
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
    if(!behandeling.documentUuid) continue;
    const doc = await editorDocumentFromUuid( behandeling.documentUuid );
    if(!doc) continue;
    const besluit = extractBesluitenFromDoc(doc, agendapunt.uri, agendapunt.geplandOpenbaar, behandeling.uri, behandeling.stemmingen);
    besluiten.push(besluit);
  }
  return wrapZittingInfo(besluiten, zitting);
}

function extractBesluitenFromDoc( doc, agendapunt, openbaar, behandeling, stemmingen) {
  var besluitenBuffer=[];
  const contexts = analyse( doc.getTopDomNode() ).map((c) => c.context);
  const triples = cleanupTriples(Array.concat(...contexts));
  const besluiten = triples.filter((t) => t.predicate === "a" && t.object === "http://data.vlaanderen.be/ns/besluit#Besluit").map( (b) => b.subject);

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
  }
  return besluitenBuffer;
}

async function wrapZittingInfo(besluitenlijst, zitting) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/besluitenlijst-prepublish.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  const html = template({besluitenlijst, zitting, prefixes: prefixes.join(" ")});
  const errors = [];
  if(!zitting.geplandeStart) {
    errors.push('You must set the planned start of the meeting');
  }
  return {html, errors};
}

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
    const {html, errors} = await buildBesluitenLijstForZitting( zitting );
    if(errors.length) {
      throw new Error(errors.join(', '));
    }
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
          ext:content ${hackedSparqlEscapeString( html )};
          mu:uuid ${sparqlEscapeString( besluitenLijstUuid )}.
        ${sparqlEscapeUri(zitting.uri)} besluit:heeftBesluitenlijst ${sparqlEscapeUri(besluitenLijstUri)}.
      }`);

    return besluitenLijstUri;
  }
}

async function signVersionedBesluitenlijst( versionedBesluitenLijstUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedBesluitenLijstUri, sessionId, targetStatus, 'ext:signsBesluitenlijst');
}

async function publishVersionedBesluitenlijst( versionedBesluitenLijstUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedBesluitenLijstUri, sessionId, targetStatus, 'ext:publishesBesluitenlijst');
}


export { extractBesluitenFromDoc, signVersionedBesluitenlijst, publishVersionedBesluitenlijst, ensureVersionedBesluitenLijstForZitting, buildBesluitenLijstForZitting };
