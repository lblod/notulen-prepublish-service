import {query, sparqlEscapeUri} from "mu";
import {prefixMap} from "./prefixes";

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