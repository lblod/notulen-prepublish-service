import {prefixMap} from "../support/prefixes";
import {hackedSparqlEscapeString} from "../support/pre-importer";

import {uuid, query, sparqlEscapeString, update, sparqlEscapeUri} from "mu";

export default class VersionedAgenda {
  static async query({meetingUuid, agendaType}) {
    const result = await query(`
      ${prefixMap.get("mu").toSparqlString()}
      ${prefixMap.get("bv").toSparqlString()}
      SELECT ?uri ?agendaType ?meeting ?html
      WHERE {
        BIND(${sparqlEscapeString(agendaType)} as ?agendaType)
        ?uri
           a bv:Agenda;
           ext:renderedContent ?html;
           bv:isAgendaVoor ?meeting;
           bv:agendaType ?agendaType.
        ?meeting mu:uuid ${sparqlEscapeString(meetingUuid)}.
      } LIMIT 1
    `);
    if (result.results.binding.length === 0) {
      return null;
    }
    else {
      const binding = result.results.bindings[0];
      return new VersionedAgenda({
        meeting: binding.meeting.value,
        agendaType: binding.agendaType.value,
        html: binding.html.value,
        uri: binding.uri.value
      });
    }
  }

  static async create({meeting, agendaType, html}) {
    console.log(`Creating a new versioned agenda for ${meeting}`);
    const agendaUuid = uuid();
    const agendaUri = `http://data.lblod.info/id/agendas/${agendaUuid}`;

    await update(`
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX bv: <http://data.vlaanderen.be/ns/besluitvorming#>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      INSERT DATA {
        ${sparqlEscapeUri(agendaUri)}
           a bv:Agenda;
           ext:renderedContent ${hackedSparqlEscapeString(html)};
           bv:isAgendaVoor ${sparqlEscapeUri(meeting)};
           mu:uuid ${sparqlEscapeString(agendaUuid)};
           bv:agendaType ${sparqlEscapeString(agendaType)}.
      }`);
    return new VersionedAgenda({html, uri: agendaUri, agendaType, meeting});
  }

  constructor({uri, html = null, meeting, agendaType}) {
    this.html = html;
    this.meeting = meeting;
    this.agendaType = agendaType;
    this.uri = uri;
  }

}
