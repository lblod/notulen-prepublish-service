const prefixes = [
  "eli: http://data.europa.eu/eli/ontology#",
  "prov: http://www.w3.org/ns/prov#",
  "mandaat: http://data.vlaanderen.be/ns/mandaat#",
  "besluit: http://data.vlaanderen.be/ns/besluit#",
  "ext: http://mu.semte.ch/vocabularies/ext/",
  "person: http://www.w3.org/ns/person#",
  "persoon: http://data.vlaanderen.be/ns/persoon#",
  "dateplugin: http://say.data.gift/manipulators/insertion/",
  "besluittype: https://data.vlaanderen.be/id/concept/BesluitType/",
  "dct: http://purl.org/dc/terms/",
  "mobiliteit: https://data.vlaanderen.be/ns/mobiliteit#",
  "lblodmow: http://data.lblod.info/vocabularies/mobiliteit/",
];

class Prefix {
  constructor(name, uri) {
    this.name = name;
    this.uri = uri;
  }

  toAttributeString() {
    return `${this.name}: ${this.uri}`;
  }

  toSparqlString() {
    return `PREFIX ${this.name}: <${this.uri}>`;
  }
}

const prefixMap = new Map([
  ["ext", new Prefix("ext", "http://mu.semte.ch/vocabularies/ext/")],
  ["mu", new Prefix("mu", "http://mu.semte.ch/vocabularies/core/")],
  ["muSession", new Prefix("muSession", "http://mu.semte.ch/vocabularies/session/")],
  ["tmp", new Prefix("tmp", "http://mu.semte.ch/vocabularies/tmp/")],
  ["besluit", new Prefix("besluit", "http://data.vlaanderen.be/ns/besluit#")],
  ["bv", new Prefix("bv", "http://data.vlaanderen.be/ns/besluitvorming#")],
  ["mandaat", new Prefix("mandaat", "http://data.vlaanderen.be/ns/mandaat#")],
  ["persoon", new Prefix("persoon", "http://data.vlaanderen.be/ns/persoon#")],
  ["generiek", new Prefix("generiek", "http://data.vlaanderen.be/ns/generiek#")],
  ["mobiliteit", new Prefix("mobiliteit", "https://data.vlaanderen.be/ns/mobiliteit#")],
  ["publicationStatus", new Prefix("publicationStatus", "http://mu.semte.ch/vocabularies/ext/signing/publication-status/")],
  ["eli", new Prefix("eli", "http://data.europa.eu/eli/ontology#")],
  ["m8g", new Prefix("m8g", "http://data.europa.eu/m8g/")],
  ["dct", new Prefix("dct", "http://purl.org/dc/terms/")],
  ["cpsv", new Prefix("cpsv", "http://purl.org/vocab/cpsv#")],
  ["dul", new Prefix("dul", "http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#")],
  ["adms", new Prefix("adms", "http://www.w3.org/ns/adms#")],
  ["person", new Prefix("person", "http://www.w3.org/ns/person#")],
  ["org", new Prefix("org", "http://www.w3.org/ns/org#")],
  ["prov", new Prefix("prov", "http://www.w3.org/ns/prov#")],
  ["regorg", new Prefix("regorg", "https://www.w3.org/ns/regorg#")],
  ["skos", new Prefix("skos", "http://www.w3.org/2004/02/skos/core#")],
  ["foaf", new Prefix("foaf", "http://xmlns.com/foaf/0.1/")],
  ["nao", new Prefix("nao", "http://www.semanticdesktop.org/ontologies/2007/08/15/nao#")],
  ["pav", new Prefix("pav", "http://purl.org/pav/")],
  ["schema", new Prefix("schema", "http://schema.org/")],
  ["rdfs", new Prefix("rdfs", "http://www.w3.org/2000/01/rdf-schema#")],
  ["sign", new Prefix("sign", "http://mu.semte.ch/vocabularies/ext/signing/")],
  ["lblodlg", new Prefix("lblodlg", "http://data.lblod.info/vocabularies/leidinggevenden/")],
  ["lblodmow", new Prefix("lblodmow", "http://data.lblod.info/vocabularies/mobiliteit/")],
  ["locn", new Prefix("locn", "http://www.w3.org/ns/locn#")],
  ["adres", new Prefix("adres", "https://data.vlaanderen.be/ns/adres#")],
  ["persoon", new Prefix("persoon", "http://data.vlaanderen.be/ns/persoon#")],
]);

export {prefixes, prefixMap};
