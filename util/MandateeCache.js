import {query, sparqlEscapeString, sparqlEscapeUri} from "mu";
import Mandatee from "../models/mandatee";
import {prefixMap} from "./prefixes";

export default class MandateeCache {
  constructor() {
    this.cache = {}
  }
  async find(uri) {
    if(this.cache[uri]) {
      return this.cache[uri];
    } else {
      const mandateeQuery = await query(`
        ${prefixMap.get("besluit").toSparqlString()}
        ${prefixMap.get("mandaat").toSparqlString()}
        ${prefixMap.get("foaf").toSparqlString()}
        ${prefixMap.get("persoon").toSparqlString()}
          SELECT * WHERE {
            ${sparqlEscapeUri(uri)} mandaat:isBestuurlijkeAliasVan ?personUri.
            ?personUri foaf:familyName ?familyName.
            ?personUri persoon:gebruikteVoornaam ?name.
          } ORDER BY ASC(?familyName) ASC(?name)
      `);
      const mandatee = new Mandatee(mandateeQuery.results.bindings[0]);
      this.cache[uri] = mandatee;
      return mandatee;
    }
  }
}