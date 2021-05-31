import {prefixMap} from "../support/prefixes";
import {DateTime} from 'luxon';
import {query, sparqlEscapeString} from "mu";
const dateFormat = process.env.DATE_FORMAT || 'dd/MM/yyyy HH:mm';

export default class Meeting {
  static async find(uuid) {
    const queryString = `
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("prov").toSparqlString()}
    ${prefixMap.get("mu").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    SELECT * WHERE {
        ?uri a besluit:Zitting;
      besluit:isGehoudenDoor ?adminBodyUri;
      besluit:geplandeStart ?plannedStart;
      mu:uuid ${sparqlEscapeString(uuid)}.
        ?adminBodyUri mandaat:isTijdspecialisatieVan ?mainBestuursorgaanUri.
        ?mainBestuursorgaanUri skos:prefLabel ?adminBodyName.
        OPTIONAL {
            ?uri prov:atLocation ?location.
        }
      OPTIONAL {
          ?uri prov:startedAtTime ?startedAt.
      }
      OPTIONAL {
          ?uri prov:endedAtTime ?endedAt.
      }
      OPTIONAL {
          ?uri ext:intro ?intro.
      }
      OPTIONAL {
          ?uri ext:outro ?outro.
      }
    }`;
    const result = await query(queryString);
    if (result.results.bindings.length !== 1) {
      throw `found ${result.results.bindings.length} meetings for id ${uuid}`;
    }
    return new Meeting(result.results.bindings[0]);
  }

  constructor(bindings) {
    this.uri = bindings.uri.value;
    this.adminBodyUri = bindings.adminBodyUri?.value;
    this.adminBodyName = bindings.adminBodyName?.value;
    this.startedAt = bindings.startedAt?.value;
    this.endedAt = bindings.endedAt?.value;
    this.plannedStart = bindings.plannedStart?.value;
    this.intro = bindings.intro?.value;
    this.outro = bindings.outro?.value;
    this.location = bindings.location?.value;
    this.startedAtText = this.startedAt ? DateTime.fromISO(this.startedAt).toFormat(dateFormat) : "";
    this.endedAtText = this.endedAt ? DateTime.fromISO(this.endedAt).toFormat(dateFormat) : "";
    this.plannedStartText = this.plannedStart ? DateTime.fromISO(this.plannedStart).toFormat(dateFormat) : "";
  }
}
