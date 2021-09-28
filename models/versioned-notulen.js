// @ts-ignore
import {uuid, query, sparqlEscapeString, update, sparqlEscapeUri} from "mu";
import { hackedSparqlEscapeString } from '../support/pre-importer';

const AGENDAPOINT_TYPE_PLANNED = 'http://lblod.data.gift/concepts/bdf68a65-ce15-42c8-ae1b-19eeb39e20d0';

export default class VersionedNotulen {
  static async query({kind, meeting}) {
    const r = await query(`
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX sign: <http://mu.semte.ch/vocabularies/ext/signing/>

    SELECT ?uri ?html
    WHERE {
      ?uri a ext:VersionedNotulen;
                  ext:notulenKind ${sparqlEscapeString(kind)};
                  ext:content ?html.
      ${sparqlEscapeUri(meeting.uri)} ext:hasVersionedNotulen  ?uri.
    } LIMIT 1
  `);
    const bindings = r.results.bindings;
    if (bindings.length > 0) {
      const binding = bindings[0];
      return new VersionedNotulen({uri: binding.uri.value, html: binding.html.value,  kind, meeting: meeting.uri});
    }
    else {
      return null;
    }
  }

  static async create({kind, meeting, html, publicTreatments}) {
    const versionedNotulenUuid = uuid();
    const versionedNotulenUri = `http://data.lblod.info/versioned-notulen/${versionedNotulenUuid}`;
    await update( `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA{
        ${sparqlEscapeUri(versionedNotulenUri)}
          a ext:VersionedNotulen;
          ext:content ${hackedSparqlEscapeString(html)};
          ext:notulenKind ${sparqlEscapeString(kind)};
          mu:uuid ${sparqlEscapeString( versionedNotulenUuid )}.
        ${publicTreatments.map((uri) => ` ${sparqlEscapeUri(versionedNotulenUri)} ext:publicBehandeling ${sparqlEscapeUri(uri)}.`).join(' ')}
        ${sparqlEscapeUri(meeting.uri)} ext:hasVersionedNotulen ${sparqlEscapeUri(versionedNotulenUri)}.
      }`);
    await update(`
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      INSERT {
          ?agendapoint besluit:Agendapunt.type ${sparqlEscapeUri(AGENDAPOINT_TYPE_PLANNED)}
      }
      WHERE {
          ${sparqlEscapeUri(meeting.uri)} a besluit:Zitting.
          ${sparqlEscapeUri(meeting.uri)} besluit:behandelt ?agendapoint.
          FILTER( NOT EXISTS { ?agendapoint besluit:Agendapunt.type ?type})
     }
    `);
    return new VersionedNotulen({html, uri: versionedNotulenUri, meeting: meeting.uri, kind});
  }

  constructor({uri, html, kind, meeting}) {
    this.uri = uri;
    this.html = html;
    this.meeting = meeting;
    this.kind = kind;
  }
}
