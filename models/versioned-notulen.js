// @ts-strict-ignore

import { uuid, query, sparqlEscapeString, update, sparqlEscapeUri } from 'mu';
/** @import { SparqlResponse } from 'mu' */
import {
  persistContentToFile,
  writeFileMetadataToDb,
  getFileContentForUri,
} from '../support/file-utils';
import { prefixMap } from '../support/prefixes';

const AGENDAPOINT_TYPE_PLANNED =
  'http://lblod.data.gift/concepts/bdf68a65-ce15-42c8-ae1b-19eeb39e20d0';

/**
 * type-imports
 * @import Meeting from './meeting'
 */

export default class VersionedNotulen {
  static async query({ kind, meeting }) {
    const r = await query(`
    ${prefixMap['ext'].toSparqlString()}
    ${prefixMap['mu'].toSparqlString()}
    ${prefixMap['prov'].toSparqlString()}
    ${prefixMap['nie'].toSparqlString()}

    SELECT ?uri ?html ?fileUri
    WHERE {
      ?uri a ext:VersionedNotulen;
                  ext:notulenKind ${sparqlEscapeString(kind)}.
      OPTIONAL { ?uri ext:content ?html. }
      OPTIONAL { ?uri prov:generated/^nie:dataSource ?fileUri. }
      ${sparqlEscapeUri(meeting.uri)} ext:hasVersionedNotulen  ?uri.
      FILTER NOT EXISTS { ?uri ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean> }
    } LIMIT 1
  `);
    const bindings = r.results.bindings;
    if (bindings.length > 0) {
      const binding = bindings[0];

      const fileUri = binding.fileUri?.value;
      let html;
      if (fileUri) {
        html = await getFileContentForUri(fileUri);
      } else {
        html = binding.content?.value;
      }
      return new VersionedNotulen({
        uri: binding.uri.value,
        html,
        kind,
        meeting: meeting.uri,
      });
    } else {
      return null;
    }
  }

  /**
   * @typedef {Object} Params
   * @property {string} [notulenUri]
   * @property {string} kind
   * @property {Meeting} meeting
   * @property {string} html
   * @property {string[]} publicTreatments
   */
  /**
   * create a new versioned notulen
   * @param {Params} args
   * @returns {Promise<VersionedNotulen>}
   */
  static async create({ notulenUri, kind, meeting, html, publicTreatments }) {
    let versionedNotulenUuid;
    let versionedNotulenUri;
    if (!notulenUri) {
      versionedNotulenUuid = uuid();
      versionedNotulenUri = `http://data.lblod.info/versioned-notulen/${versionedNotulenUuid}`;
    } else {
      versionedNotulenUri = notulenUri;
    }
    // defend against existing resource
    // an ask query is extremely fast
    // specifically not taking Tombstones into account here, this a create
    // which always inserts, so it's always an error if the uri already exists
    //
    // could arguably also no-op instead of error for sake of idempotence,
    // but this is more explicit
    /** @type {SparqlResponse<true>} */
    // @ts-ignore
    const exists = await query(`
      ASK { ${sparqlEscapeUri(versionedNotulenUri)} ?p ?v. }
      `);
    // it always returns an object shaped like { boolean: true }
    // be careful to not do if(exists)
    if (exists.boolean) {
      throw new Error(
        'Trying to create a versioned resource which already exists'
      );
    }
    const fileInfo = await persistContentToFile(html);
    const logicalFileUri = await writeFileMetadataToDb(fileInfo);
    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA{
        ${sparqlEscapeUri(versionedNotulenUri)}
          a ext:VersionedNotulen;
          prov:generated ${sparqlEscapeUri(logicalFileUri)};
          ext:notulenKind ${sparqlEscapeString(kind)};
          ${
            versionedNotulenUuid
              ? `mu:uuid ${sparqlEscapeString(versionedNotulenUuid)};`
              : ''
          }
          ext:deleted "false"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>.
        ${publicTreatments
          .map(
            (uri) =>
              ` ${sparqlEscapeUri(
                versionedNotulenUri
              )} ext:publicBehandeling ${sparqlEscapeUri(uri)}.`
          )
          .join(' ')}
        ${sparqlEscapeUri(
          meeting.uri
        )} ext:hasVersionedNotulen ${sparqlEscapeUri(versionedNotulenUri)}.
      }`);
    await update(`
      PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
      INSERT {
          ?agendapoint besluit:Agendapunt.type ${sparqlEscapeUri(
            AGENDAPOINT_TYPE_PLANNED
          )}
      }
      WHERE {
          ${sparqlEscapeUri(meeting.uri)} a besluit:Zitting.
          ${sparqlEscapeUri(meeting.uri)} besluit:behandelt ?agendapoint.
          FILTER( NOT EXISTS { ?agendapoint besluit:Agendapunt.type ?type})
    }
    `);
    return new VersionedNotulen({
      html,
      uri: versionedNotulenUri,
      meeting: meeting.uri,
      kind,
    });
  }

  constructor({ uri, html, kind, meeting }) {
    this.uri = uri;
    this.html = html;
    this.meeting = meeting;
    this.kind = kind;
  }
}
