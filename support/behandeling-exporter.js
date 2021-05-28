// @ts-ignore
import { uuid, query, update, sparqlEscapeUri, sparqlEscapeString } from 'mu';
import {handleVersionedResource, hackedSparqlEscapeString} from './pre-importer';
import validateMeeting from './validate-meeting';
import * as path from "path";
import * as fs from "fs";
import Handlebars from "handlebars";
import {prefixes} from "./prefixes";
import jsdom from 'jsdom';

const DRAFT_DECISON_PUBLISHED_STATUS = 'http://mu.semte.ch/application/concepts/ef8e4e331c31430bbdefcdb2bdfbcc06';
/**
 * Finds a versioned behandeling based on provided uri
 * does not check if it's linked to the right container
 */
async function findVersionedBehandeling(uuid) {
  const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?versionedBehandeling ?body ?uuid ?behandeling
      WHERE
      {
        ?versionedBehandeling a ext:VersionedBehandeling;
                  mu:uuid ?uuid;
                  ext:content ?body;
                  ext:behandeling ?behandeling.
        ?behandeling mu:uuid ${sparqlEscapeString(uuid)}.
      }
  `);
  const bindings = r.results.bindings;
  if (bindings.length > 0)
    return { body: bindings[0].body.value, behandeling: bindings[0].behandeling.value, uuid: bindings[0].uuid.value, versionedBehandeling: bindings[0].versionedBehandeling.value };
  else
    return null;
}

/**
 * extracts a behandeling from the supplied document
 * searches for a BehandelingVanAgendapunt in the document with a matching uri and returns that node
 */
function createBehandelingExtract(zitting, agendapunt, isWrappedInZittingInfo = true, isPublic = true) {
  let behandelingHTML;
  if(isPublic) {
    behandelingHTML = generateBehandelingHTML(agendapunt);
  } else {
    behandelingHTML = generatePrivateBehandelingHTML(agendapunt);
  }
  if (isWrappedInZittingInfo) {
    return wrapZittingInfo(zitting, behandelingHTML);
  } else {
    return behandelingHTML;
  }
}

function wrapZittingInfo(zitting, behandelingHTML) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/behandeling-prepublish.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  const html = template({behandelingHTML, zitting, prefixes: prefixes.join(" ")});
  const errors = validateMeeting({
    plannedStart: zitting.geplandeStart,
    startedAt: zitting.start,
    endedAt: zitting.end
  });
  return {html, errors};
}

function generateBehandelingHTML(agendapunt) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/behandeling-html.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  const behandelingUri = agendapunt.behandeling.uri;
  const agendapuntUri = agendapunt.uri;
  const agendapuntTitle = agendapunt.titel;
  const openbaar = agendapunt.behandeling.openbaar === 'true';
  const document = agendapunt.behandeling.document.content;
  const secretary = agendapunt.behandeling.secretary;
  const chairman = agendapunt.behandeling.chairman;
  const presentMandatees = agendapunt.behandeling.presentMandatees;
  const notPresentMandatees = agendapunt.behandeling.notPresentMandatees;
  const stemmings = agendapunt.behandeling.stemmings;
  let participationList;
  //Only fill participationList when there's content to make it easier to hide in template
  if(secretary || chairman || (presentMandatees && presentMandatees.length) || (notPresentMandatees && notPresentMandatees.length)) {
    participationList = {
      secretary,
      chairman,
      presentMandatees,
      notPresentMandatees
    };
  }
  return template({behandelingUri, agendapuntUri, agendapuntTitle, openbaar, document, participationList, stemmings});
}

function generatePrivateBehandelingHTML(agendapunt) {
  const templateStr = fs
    .readFileSync(path.join(__dirname, "templates/private-behandeling-html.hbs"))
    .toString();
  const template = Handlebars.compile(templateStr);
  const behandelingUri = agendapunt.behandeling.uri;
  const agendapuntUri = agendapunt.uri;
  const agendapuntTitle = agendapunt.title;
  const openbaar = agendapunt.behandeling.openbaar === 'true';
  const secretary = agendapunt.behandeling.secretary;
  const chairman = agendapunt.behandeling.chairman;
  const presentMandatees = agendapunt.behandeling.presentMandatees;
  const notPresentMandatees = agendapunt.behandeling.notPresentMandatees;
  const stemmings = agendapunt.behandeling.stemmings;
  let participationList;
  //Only fill participationList when there's content to make it easier to hide in template
  if(secretary || chairman || (presentMandatees && presentMandatees.length) || (notPresentMandatees && notPresentMandatees.length)) {
    participationList = {
      secretary,
      chairman,
      presentMandatees,
      notPresentMandatees
    };
  }
  const document = agendapunt.behandeling.document.content;
  const documentNode = new jsdom.JSDOM(document).window.document;
  const documentContainer = documentNode.querySelector(`[property='prov:generated']`);
  const isBesluit = documentContainer && documentContainer.getAttribute('typeof').includes('besluit:Besluit');
  if(isBesluit) {
    const besluitTitle = documentContainer.querySelector(`[property='eli:title']`).outerHTML;
    const besluitDescription = documentContainer.querySelector(`[property='eli:description']`).outerHTML;
    documentContainer.innerHTML = `${besluitTitle}${besluitDescription}`;
    return template({behandelingUri, agendapuntUri, agendapuntTitle, openbaar, participationList, stemmings, isBesluit, document: documentContainer.outerHTML});
  } else {
    return template({behandelingUri, agendapuntUri, agendapuntTitle, participationList, stemmings, openbaar, isBesluit});
  }
}

/**
 * Creates a versioned behandeling in the triple store which could be signed or published
 * The versioned behandeling is attached to the document container
 */
async function ensureVersionedBehandelingForZitting(zitting, behandelingUuid) {
  const versionedBehandeling = await findVersionedBehandeling(behandelingUuid);
  if (versionedBehandeling) {
    console.log(`reusing versioned behandeling for document ${zitting.uri} and behandeling ${behandelingUuid}`);
    return versionedBehandeling.versionedBehandeling;
  }
  else {
    console.log(`creating a new versioned behandeling for document ${zitting.uri} and behandeling ${behandelingUuid}`);
    const agendapunt = zitting.agendapunten.find((agendapunt) => agendapunt.behandeling.uuid === behandelingUuid);
    const {html, errors} = createBehandelingExtract(zitting, agendapunt);
    if(errors.length) {
      throw new Error(errors.join(', '));
    }
    const versionedBehandelingUuid = uuid();
    const versionedBehandelingUri = `http://data.lblod.info/prepublished-behandelingen/${versionedBehandelingUuid}`;
    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT {
        ${sparqlEscapeUri(versionedBehandelingUri)}
           a ext:VersionedBehandeling;
           ext:content ${hackedSparqlEscapeString( html )};
           mu:uuid ${sparqlEscapeString( versionedBehandelingUuid )};
           ext:behandeling ?behandeling.
        ${sparqlEscapeUri(zitting.uri)} ext:hasVersionedBehandeling ${sparqlEscapeUri(versionedBehandelingUri)}.
      } WHERE {
        ?behandeling mu:uuid ${sparqlEscapeString(behandelingUuid)}
      }`);
    return versionedBehandelingUri;
  }
}

/**
 * Returns extracts of behandelings van agendapunten, either extracted from the document or if it already exists in the store the version from the store.
 * NOTE: this is different from other extractions!
 * Returns an array of behandeling extractions
 */
async function extractBehandelingVanAgendapuntenFromZitting( zitting, isWrappedInZittingInfo ) {
  const agendapunten = zitting.agendapunten;
  const extracts = [];
  for (const agendapunt of agendapunten) {
    const {html, errors} = createBehandelingExtract(zitting, agendapunt, isWrappedInZittingInfo);
    console.log(`creating temporary behandeling extract for ${zitting.uri}`);
    extracts.push({
      data: {
        attributes: {
          content: html,
          errors,
          behandeling: agendapunt.behandeling.uri,
          uuid: agendapunt.behandeling.uuid
        }
      }
    });
  }
  return extracts;
}

/**
 * Checks if a behandeling has already been published or not.
 * Returns true if published, false if not.
 */
async function isPublished( behandelingUri ) {
  const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      SELECT ?versionedBehandeling
      WHERE
      {
        ?versionedBehandeling a ext:VersionedBehandeling;
                  ext:behandeling ${sparqlEscapeUri(behandelingUri)}.
        FILTER EXISTS { ?publishedResource ext:publishesBehandeling ?versionedBehandeling }.
      } LIMIT 1
  `);
  return r.results.bindings.length > 0;
}

async function signVersionedBehandeling( versionedBehandelingUri, sessionId, targetStatus ) {
  await handleVersionedResource( "signature", versionedBehandelingUri, sessionId, targetStatus, 'ext:signsBehandeling');
}

async function publishVersionedBehandeling( versionedBehandelingUri, sessionId, targetStatus ) {
  await handleVersionedResource( "publication", versionedBehandelingUri, sessionId, targetStatus, 'ext:publishesBehandeling');
  await updateDraftDecisionStatus(versionedBehandelingUri);
}

async function updateDraftDecisionStatus(versionedBehandelingUri) {
  const documentContainerQuery = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    SELECT ?documentContainer WHERE  {
      ${sparqlEscapeUri(versionedBehandelingUri)} a ext:VersionedBehandeling;
        ext:behandeling ?behandeling.
      ?behandeling ext:hasDocumentContainer ?documentContainer.
    }
  `);
  if(!documentContainerQuery.results.bindings.length) throw new Error('Document container not found for versioned behandeling ' + versionedBehandelingUri);
  const documentContainerUri = documentContainerQuery.results.bindings[0].documentContainer.value;
  await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ?status
    } INSERT {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ${sparqlEscapeUri(DRAFT_DECISON_PUBLISHED_STATUS)}
    } WHERE {
      ${sparqlEscapeUri(documentContainerUri)} ext:editorDocumentStatus ?status
    }
  `);
}

export { extractBehandelingVanAgendapuntenFromZitting, ensureVersionedBehandelingForZitting, isPublished, signVersionedBehandeling, publishVersionedBehandeling, createBehandelingExtract };
