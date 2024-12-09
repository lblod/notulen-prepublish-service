// @ts-nocheck
import { prefixMap } from '../support/prefixes';
import { hackedSparqlEscapeString } from '../support/pre-importer';

// @ts-ignore
import { uuid, query, sparqlEscapeString, update, sparqlEscapeUri } from 'mu';

export default class VersionedAgenda {
  static async query({ meetingUuid, agendaType }) {
    const result = await query(`
      ${prefixMap['mu'].toSparqlString()}
      ${prefixMap['bv'].toSparqlString()}
      ${prefixMap['ext'].toSparqlString()}
      SELECT ?uri ?agendaType ?meeting ?html
      WHERE {
        BIND(${sparqlEscapeString(agendaType)} as ?agendaType)
        ?uri
          a bv:Agenda;
          ext:renderedContent ?html;
          bv:isAgendaVoor ?meeting;
           bv:agendaType ?agendaType.
        ?meeting mu:uuid ${sparqlEscapeString(meetingUuid)}.
        FILTER NOT EXISTS { ?uri ext:deleted "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean> }
      } LIMIT 1
    `);
    if (result.results.bindings.length === 0) {
      return null;
    } else {
      const binding = result.results.bindings[0];
      return new VersionedAgenda({
        meeting: binding.meeting.value,
        agendaType: binding.agendaType.value,
        html: binding.html.value,
        uri: binding.uri.value,
      });
    }
  }

  static async create({ meeting, agendaType, agendapoints, html }) {
    console.log(`Creating a new versioned agenda for ${meeting}`);
    const agendaUuid = uuid();
    const agendaUri = `http://data.lblod.info/id/agendas/${agendaUuid}`;

    await update(`
      ${prefixMap['mu'].toSparqlString()}
      ${prefixMap['bv'].toSparqlString()}
      ${prefixMap['ext'].toSparqlString()}
      ${prefixMap['pav'].toSparqlString()}

      INSERT DATA {
        ${sparqlEscapeUri(agendaUri)}
           a bv:Agenda;
           ext:renderedContent ${hackedSparqlEscapeString(html)};
           bv:isAgendaVoor ${sparqlEscapeUri(meeting)};
           mu:uuid ${sparqlEscapeString(agendaUuid)};
           ext:deleted "false"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>;
           bv:agendaType ${sparqlEscapeString(agendaType)}.
      }`);
    await update(`
      INSERT DATA {
       ${agendapoints
         .map(
           (ap) =>
             `${sparqlEscapeUri(
               ap.uri
             )} <http://data.vlaanderen.be/ns/besluit#Agendapunt.type> ${sparqlEscapeUri(
               ap.type
             )}.`
         )
         .join('\n')}
      }
    `);
    return new VersionedAgenda({ html, uri: agendaUri, agendaType, meeting });
  }

  constructor({ uri, html = null, meeting, agendaType }) {
    this.html = html;
    this.meeting = meeting;
    this.agendaType = agendaType;
    this.uri = uri;
  }
}
