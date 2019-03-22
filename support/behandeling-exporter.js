import { query, sparqlEscapeUri } from 'mu';
import {wrapZittingInfo, handleVersionedResource, cleanupTriples, hackedSparqlEscapeString} from './pre-importer';
import {findFirstNodeOfType, findAllNodesOfType} from '@lblod/marawa/dist/dom-helpers';
import { analyse, resolvePrefixes } from '@lblod/marawa/dist/rdfa-context-scanner';

async function findVersionedBehandeling(uri) {
  const r = await query(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      SELECT ?document ?body ?uuid
      WHERE
      {
        ?document a ext:VersionedBehandeling;
                  mu:uuid ?uuid;
                  ext:content ?body;
                  ext:wasDerivedFrom ?editorDocument;
                  ext:behandeling ${sparqlEscapeUri(uri)}.
        ?editorContainer pav:hasVersion ?editorDocument.
      }
  `);
  const bindings = r.results.bindings;
  if (bindings.length > 0)
    return { body: bindings[0].body, behandeling: uri, uuid: bindings[0].uuid };
  else
    return null;
}

function createBehandelingExtract(doc, behandeling) {
  const behandelingNodes = findAllNodesOfType( doc.getTopDomNode(), "http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt" ).filter((node) => node.getAttribute('resource') === behandeling);
  if (behandelingNodes.length > 0 ) {
    var prefix = "";
    for( var key of Object.keys(doc.context.prefix) )
      prefix += `${key}: ${doc.context.prefix[key]} `;
    const body = `<div class="behandeling" prefix="${prefix}">${wrapZittingInfo(doc, behandelingNodes[0].outerHTML)}</div>`;
    return { body, behandeling };
  }
  throw "Behandeling not found";
}
/**
 * Returns extracts of behandelings van agendapunten, either extracted from the document or if it already exists in the store the version from the store.
 * NOTE: this is different from other extractions!
 * Returns an array of behandeling extractions
 */
async function extractBehandelingVanAgendapuntenFromDoc( doc ) {
  const zitting = findFirstNodeOfType( doc.getTopDomNode(), 'http://data.vlaanderen.be/ns/besluit#Zitting' );
  if (zitting) {
    const contexts = analyse( zitting ).map((c) => c.context);
    const triples = cleanupTriples(Array.concat(...contexts));
    const behandelingen = triples.filter((t) => t.predicate === "a" && t.object === "http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt").map( (b) => b.subject);
    const extracts = [];
    for (const behandeling of behandelingen) {
      const existingExtract = await findVersionedBehandeling(behandeling);
      if (existingExtract) {
        extracts.push(existingExtract);
      }
      else {
        const newExtract = createBehandelingExtract(doc, behandeling);
        console.log(newExtract);
        extracts.push(newExtract);
      }
    }
    console.log(extracts);
    return extracts;
  }
  return [];
}

export { extractBehandelingVanAgendapuntenFromDoc }
