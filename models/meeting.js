import { prefixMap } from "../support/prefixes";
import { DateTime } from 'luxon';
import { query, sparqlEscapeString, sparqlEscapeUri } from "mu";
import validateMeeting from "../support/validate-meeting";
const dateFormat = process.env.DATE_FORMAT || 'dd/MM/yyyy HH:mm';

export default class Meeting {
  static async findURI(uri) {
    const queryString = `
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("prov").toSparqlString()}
    ${prefixMap.get("mu").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("notulen").toSparqlString()}
    SELECT * WHERE {
      BIND(${sparqlEscapeUri(uri)} as ?uri)
      ?uri a besluit:Zitting;
        besluit:isGehoudenDoor ?adminBodyUri;
        besluit:geplandeStart ?plannedStart.
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
        ?uri notulen:intro ?intro.
      }
      OPTIONAL {
        ?uri notulen:outro ?outro.
      }
    }`;
    const result = await query(queryString);
    if (result.results.bindings.length !== 1) {
      throw `found ${result.results.bindings.length} meetings for uri ${uri}`;
    }
    return Meeting.fromBinding(result.results.bindings[0]);
  }

  static async find(uuid) {
    const queryString = `
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("prov").toSparqlString()}
    ${prefixMap.get("mu").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("notulen").toSparqlString()}
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
          ?uri notulen:intro ?intro.
      }
      OPTIONAL {
          ?uri notulen:outro ?outro.
      }
    }`;
    const result = await query(queryString);
    if (result.results.bindings.length !== 1) {
      throw `found ${result.results.bindings.length} meetings for id ${uuid}`;
    }
    return Meeting.fromBinding(result.results.bindings[0]);
  }

  static fromBinding(binding) {
    return new Meeting({
      uri: binding.uri.value,
      adminBodyUri: binding.adminBodyUri?.value,
      adminBodyName: binding.adminBodyName?.value,
      startedAt: binding.startedAt?.value,
      endedAt: binding.endedAt?.value,
      plannedStart: binding.plannedStart?.value,
      intro: binding.intro?.value,
      outro: binding.outro?.value,
      location: binding.location?.value
    });
  }
  constructor(
    {
      uri,
      adminBodyName = null,
      adminBodyUri = null,
      startedAt = null,
      endedAt = null,
      plannedStart = null,
      intro = null,
      outro = null,
      location = null
    }
  ) {
    this.uri = uri;
    this.adminBodyUri = adminBodyUri;
    this.adminBodyName = adminBodyName;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.plannedStart = plannedStart;
    this.startedAtText = this.startedAt ? DateTime.fromISO(this.startedAt).toFormat(dateFormat) : "";
    this.endedAtText = this.endedAt ? DateTime.fromISO(this.endedAt).toFormat(dateFormat) : "";
    this.plannedStartText = this.plannedStart ? DateTime.fromISO(this.plannedStart).toFormat(dateFormat) : "";
    this.intro = intro;
    this.outro = outro;
    this.location = location;
  }

  validate() {
    return validateMeeting(this);
  }
}
