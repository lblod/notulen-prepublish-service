import {query, sparqlEscapeUri} from "mu";
import {prefixMap} from "./prefixes";
import Mandatee from "../models/mandatee";

export async function fetchChairmanAndSecretary(uri){
  const chairmanAndSecretaryQuery = await query(`
    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("ext").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("org").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
    ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      OPTIONAL {
        ${sparqlEscapeUri(uri)} besluit:heeftVoorzitter ?chairmanUri.
          ?chairmanUri mandaat:isBestuurlijkeAliasVan ?chairmanPersonUri.
          ?chairmanUri org:holds ?chairmanRoleUri.
          ?chairmanRoleUri org:role ?chairmanBestuursfunctieCodeUri.
          ?chairmanBestuursfunctieCodeUri skos:prefLabel ?chairmanRole.
          ?chairmanPersonUri foaf:familyName ?chairmanFamilyName.
          ?chairmanPersonUri persoon:gebruikteVoornaam ?chairmanName.
      }
      OPTIONAL {
        ${sparqlEscapeUri(uri)} besluit:heeftSecretaris ?secretaryUri.
          ?secretaryUri mandaat:isBestuurlijkeAliasVan ?secretaryPersonUri.
          ?secretaryUri org:holds ?secretaryRoleUri.
          ?secretaryRoleUri org:role ?secretaryBestuursfunctieCodeUri.
          ?secretaryBestuursfunctieCodeUri skos:prefLabel ?secretaryRole.
          ?secretaryPersonUri foaf:familyName ?secretaryFamilyName.
          ?secretaryPersonUri persoon:gebruikteVoornaam ?secretaryName.
      }
    }
  `);
  return processChairmanAndSecretary(chairmanAndSecretaryQuery.results.bindings[0]);
}

function processChairmanAndSecretary(bindings) {
  let chairman;
  if(bindings.chairmanUri) {
    chairman = {
      uri: bindings.chairmanUri.value,
      personUri: bindings.chairmanPersonUri.value,
      name: bindings.chairmanName.value,
      familyName: bindings.chairmanFamilyName.value,
      roleUri: bindings.chairmanRoleUri.value,
      role: bindings.chairmanRole.value
    };
  }
  let secretary;
  if(bindings.secretaryUri) {
    secretary = {
      uri: bindings.secretaryUri.value,
      personUri: bindings.secretaryPersonUri.value,
      name: bindings.secretaryName.value,
      familyName: bindings.secretaryFamilyName.value,
      roleUri: bindings.secretaryRoleUri.value,
      role: bindings.secretaryRole.value
    };
  }
  return {chairman, secretary};
}

export async function fetchStemmingen(bvaUri) {
  const stemmingsQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(bvaUri)} besluit:heeftStemming ?stemmingUri.
      ?stemmingUri besluit:aantalVoorstanders ?positiveVotes;
        besluit:aantalTegenstanders ?negativeVotes;
        besluit:aantalOnthouders ?abstentionVotes;
        besluit:geheim ?geheim;
        besluit:onderwerp ?subject;
        besluit:gevolg ?result.
    }
  `);
  return await Promise.all(stemmingsQuery.results.bindings.map(processStemming));
}

async function processStemming(stemming) {
  const stemmingUri = stemming.stemmingUri.value;
  const attendeesQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftAanwezige ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const attendees = attendeesQuery.results.bindings.map((binding) => new Mandatee(binding));
  const votersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftStemmer ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const voters = votersQuery.results.bindings.map((binding) => new Mandatee(binding));

  const positiveVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftVoorstander ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const positiveVoters = positiveVotersQuery.results.bindings.map((binding) => new Mandatee(binding));

  const negativeVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftTegenstander ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const negativeVoters = negativeVotersQuery.results.bindings.map((binding) => new Mandatee(binding));

  const abstentionVotersQuery = await query(`
  ${prefixMap.get("besluit").toSparqlString()}
  ${prefixMap.get("mandaat").toSparqlString()}
  ${prefixMap.get("org").toSparqlString()}
  ${prefixMap.get("skos").toSparqlString()}
  ${prefixMap.get("foaf").toSparqlString()}
  ${prefixMap.get("persoon").toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(stemmingUri)} besluit:heeftOnthouder ?mandatarisUri.
      ?mandatarisUri mandaat:isBestuurlijkeAliasVan ?personUri.
      ?mandatarisUri org:holds ?positionUri.
      ?positionUri org:role ?roleUri.
      ?roleUri skos:prefLabel ?role.
      ?personUri foaf:familyName ?familyName.
      ?personUri persoon:gebruikteVoornaam ?name.
    }
  `);
  const abstentionVoters = abstentionVotersQuery.results.bindings.map((binding) => new Mandatee(binding));

  return {
    uri: stemmingUri,
    geheim: stemming.geheim.value,
    geheimText: stemming.geheim.value ? "De raad stemt openbaar," : "De raad stemt geheim,",
    positiveVotes: stemming.positiveVotes.value,
    negativeVotes: stemming.negativeVotes.value,
    abstentionVotes: stemming.abstentionVotes.value,
    subject : stemming.subject.value,
    result: stemming.result.value,
    attendees,
    voters,
    positiveVoters,
    negativeVoters,
    abstentionVoters
  };
}
