import {update, sparqlEscapeUri, sparqlEscapeString, sparqlEscapeDateTime, uuid} from  'mu';
import { findFirstNodeOfType, findAllNodesOfType } from '@lblod/marawa/dist/dom-helpers';
import { analyse, resolvePrefixes } from '@lblod/marawa/dist/rdfa-context-scanner';
import {prefixMap} from "./prefixes";

function wrapZittingInfo(doc, html) {
  const node = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );
  if (node) {
    const zittingUri = node.getAttribute('resource');
    const cleanParent = node.cloneNode(false);
    cleanParent.innerHTML = html;
    const contexts = analyse( node ).map((c) => c.context);
    const triples = Array.concat(...contexts).filter((t) => t.subject === zittingUri);
    const interestingpredicates = [
      { uri: 'http://data.vlaanderen.be/ns/besluit#geplandeStart', range: 'literal' },
      { uri: 'http://www.w3.org/ns/prov#startedAtTime', range: 'literal' },
      { uri: 'http://data.vlaanderen.be/ns/besluit#isGehoudenDoor', range: 'uri' },
      { uri: 'http://www.w3.org/ns/prov#atLocation', range: 'literal' }
    ];
    for (const predicate of interestingpredicates) {
      const triple = triples.find((t) => t.predicate === predicate.uri);
      if (triple) {
        // TODO remove spaces in spans once MARAWA supports nodes without children
        cleanParent.innerHTML = `<span property="${predicate.uri}" ${predicate.range == 'uri' ? 'resource' : 'content'}="${triple.object}" ${triple.datatype ? `datatype="${triple.datatype}"` : ''}> </span> ${cleanParent.innerHTML}`;
      }
    }
    return cleanParent.outerHTML;
  }
  else {
    console.log(`no zitting information found for editordocument ${doc.id}`);
    return html;
  }
}

function cleanupTriples(triples) {
  const cleantriples = {};
  for (const triple of triples) {
    const hash = JSON.stringify(triple);
    cleantriples[hash]=triple;
  }
  return Object.keys(cleantriples).map( (k) => cleantriples[k]);
}

function hackedSparqlEscapeString( string ) {
  return `""${sparqlEscapeString(string.replace(/\n/g, function(match) { return ''; }).replace(/\r/g, function(match) { return '';}))}""`;
};

async function handleVersionedResource( type, versionedUri, sessionId, targetStatus, customSignaturePredicate, customStatePredicate, customContentPredicate ) {
  const newResourceUuid = uuid();
  const resourceType = type == 'signature' ? "sign:SignedResource" : "sign:PublishedResource";
  const newResourceUri = `http://data.lblod.info/${type == 'signature' ? "signed-resources" : "published-resources"}/${newResourceUuid}`;
  const statePredicate = customStatePredicate || "ext:stateString";
  const contentPredicate = customContentPredicate || "ext:content";
  // TODO: get correct signatorySecret from ACMIDM
  const query = `
    ${prefixMap.get("bv").toSparqlString()}
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("mu").toSparqlString()}
    ${prefixMap.get("pav").toSparqlString()}
    ${prefixMap.get("sign").toSparqlString()}
    ${prefixMap.get("publicationStatus").toSparqlString()}
    ${prefixMap.get("muSession").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}

    DELETE {
      ${sparqlEscapeUri(versionedUri)}
        ${statePredicate} ?state.
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
        ${statePredicate} ${sparqlEscapeString(targetStatus)}.
    } WHERE {
      ${sparqlEscapeUri(versionedUri)}
        ${contentPredicate} ?content.
      ${sparqlEscapeUri(sessionId)}
        muSession:account/^foaf:account ?userUri.
      ${sparqlEscapeUri(sessionId)}
        ext:sessionRole ?signatoryRole.
      BIND ("helloworldsecretbehere" AS ?signatorySecret)
    }`;

  const updatePromise = await update( query );
  return updatePromise;
};

export {
  wrapZittingInfo,
  hackedSparqlEscapeString,
  handleVersionedResource,
  cleanupTriples
};
