import { prefixMap } from '../support/prefixes';
import { sparqlEscapeUri, query } from 'mu';
import Mandatee from './mandatee';

export default class Vote {
  static async findAll({treatmentUri}) {
    try {
      const result = await query(`
         ${prefixMap.get("besluit").toSparqlString()}
         ${prefixMap.get("schema").toSparqlString()}
         SELECT DISTINCT * WHERE {
           ${sparqlEscapeUri(treatmentUri)} a besluit:BehandelingVanAgendapunt;
                                            besluit:heeftStemming ?uri.
           ?uri a besluit:Stemming.
           ?uri besluit:onderwerp ?subject.
           ?uri besluit:gevolg ?result.
           ?uri besluit:aantalVoorstanders ?positiveVotes.
           ?uri besluit:aantalTegenstanders ?negativeVotes.
           ?uri besluit:aantalOnthouders ?abstentionVotes.
           ?uri besluit:geheim ?isSecret.
           OPTIONAL { ?uri schema:position ?position. }
        } ORDER BY ASC(?position)
      `);
      return result.results.bindings.map((binding) => Vote.fromBinding(binding));
    }
    catch(e) {
      console.log(e);
      throw `failed to fetch votes for treatment ${treatmentUri}`;
    }
  }

  static fromBinding({uri, subject, result, isSecret, positiveVotes, negativeVotes, abstentionVotes, position}) {
    return new Vote({
      uri: uri.value,
      subject: subject.value,
      result: result.value,
      isSecret: isSecret.value === "true",
      positiveVotes: positiveVotes.value,
      negativeVotes: negativeVotes.value,
      abstentionVotes: abstentionVotes.value,
      position: position?.value
    });
  }

  constructor({uri, subject, result, isSecret, positiveVotes, negativeVotes, abstentionVotes, position}) {
    this.uri = uri;
    this.subject = subject;
    this.result = result;
    this.isSecret = isSecret;
    this.positiveVotes = positiveVotes;
    this.negativeVotes = negativeVotes;
    this.abstentionVotes = abstentionVotes;
    this.position = position;
  }

  async fetchVoters() {
    const attendeesQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftAanwezige ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
    this.attendees = attendeesQuery.results.bindings.map((binding) => new Mandatee(binding));
    const votersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftStemmer ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
    this.voters = votersQuery.results.bindings.map((binding) => new Mandatee(binding));

    const positiveVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftVoorstander ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
    this.positiveVoters = positiveVotersQuery.results.bindings.map((binding) => new Mandatee(binding));

    const negativeVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftTegenstander ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
    this.negativeVoters = negativeVotersQuery.results.bindings.map((binding) => new Mandatee(binding));

    const abstentionVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftOnthouder ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
    this.abstentionVoters = abstentionVotersQuery.results.bindings.map((binding) => new Mandatee(binding));
  }
}
