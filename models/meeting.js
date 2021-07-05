import { prefixMap } from "../support/prefixes";
import { DateTime } from 'luxon';
import { query, sparqlEscapeString, sparqlEscapeUri } from "mu";
import validateMeeting from "../support/validate-meeting";
const dateFormat = process.env.DATE_FORMAT || 'dd/MM/yyyy HH:mm';

const articlesBasedOnClassifcationMap = {
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/4955bd72cd0e4eb895fdbfab08da0284': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000006': 'het',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/e14fe683-e061-44a2-b7c8-e10cab4e6ed9': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000005': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000007': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/4c38734d-2cc1-4d33-b792-0bd493ae9fc2': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000009': 'het',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e00000d': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/180a2fba-6ca9-4766-9b94-82006bb9c709': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e00000c': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/53c0d8cd-f3a2-411d-bece-4bd83ae2bbc9': 'de',
  'http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000008': 'het'
}

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
        mu:uuid ?uuid;
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
      BIND(${sparqlEscapeString(uuid)} as ?uuid)
      ?uri a besluit:Zitting;
        besluit:isGehoudenDoor ?adminBodyUri;
        besluit:geplandeStart ?plannedStart;
        mu:uuid ?uuid.
      ?adminBodyUri mandaat:isTijdspecialisatieVan ?mainBestuursorgaanUri.
      ?mainBestuursorgaanUri skos:prefLabel ?adminBodyName.
      ?mainBestuursorgaanUri besluit:classificatie ?adminBodyClassification.
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
      uuid: binding.uuid.value,
      uri: binding.uri.value,
      adminBodyUri: binding.adminBodyUri?.value,
      adminBodyName: binding.adminBodyName?.value,
      adminBodyClassification: binding.adminBodyClassification?.value,
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
      uuid,
      uri,
      adminBodyName = null,
      adminBodyUri = null,
      startedAt = null,
      endedAt = null,
      plannedStart = null,
      intro = null,
      outro = null,
      location = null,
      adminBodyClassification = null,
    }
  ) {
    this.uuid = uuid;
    this.uri = uri;
    this.adminBodyUri = adminBodyUri;
    this.adminBodyName = adminBodyName;
    this.adminBodyArticle = this.generateAdminBodyArticle(adminBodyClassification)
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
  generateAdminBodyArticle(adminBodyUri) {
    return articlesBasedOnClassifcationMap[adminBodyUri];
  }

  validate() {
    return validateMeeting(this);
  }
}
