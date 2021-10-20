import {query, sparqlEscapeUri} from "mu";
import {prefixMap} from "./prefixes";
import Mandatee from "../models/mandatee";

export default class ParticipantCache {
  constructor() {
    this.map = new Map();
  }

  set(uri, data) {
    this.map.set(uri, data);
  }

  async get(uri) {
    const value = this.map.get(uri);
    if(value) {
      return value;
    } else {
      const queryData = await query(`
        ${prefixMap.get("besluit").toSparqlString()}
        ${prefixMap.get("mandaat").toSparqlString()}
        ${prefixMap.get("org").toSparqlString()}
        ${prefixMap.get("skos").toSparqlString()}
        ${prefixMap.get("foaf").toSparqlString()}
        ${prefixMap.get("persoon").toSparqlString()}
        SELECT DISTINCT * WHERE {
          ${sparqlEscapeUri(uri)} mandaat:isBestuurlijkeAliasVan ?personUri;
            org:holds ?positionUri.
          ?positionUri org:role ?roleUri.
          ?roleUri skos:prefLabel ?role.
          ?personUri foaf:familyName ?familyName.
          ?personUri persoon:gebruikteVoornaam ?name.
        }
      `);
      const mandatee = new Mandatee({...queryData.results.bindings[0], mandatarisUri: uri});
      this.map.set(uri, mandatee);
      return mandatee;
    }
  }
}