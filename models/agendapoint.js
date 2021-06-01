import {prefixMap} from "../support/prefixes";
import {query, sparqlEscapeString, sparqlEscapeUri} from "mu";

export default class AgendaPoint {
  static async findAll({meetingUuid}) {
    const queryString = `
     ${prefixMap.get("besluit").toSparqlString()}
     ${prefixMap.get("dct").toSparqlString()}
     ${prefixMap.get("schema").toSparqlString()}
     ${prefixMap.get("mu").toSparqlString()}
     ${prefixMap.get("skos").toSparqlString()}
      SELECT * WHERE {
          ?meeting a besluit:Zitting;
                   mu:uuid ${sparqlEscapeString(meetingUuid)};
                   besluit:behandelt ?uri.
          ?uri besluit:geplandOpenbaar ?plannedPublic.
          ?uri dct:title ?title.
          ?uri schema:position ?position.
          OPTIONAL {
            ?uri besluit:aangebrachtNa ?addedAfter.
          }
          OPTIONAL {
            ?uri dct:description ?description.
          }
          OPTIONAL {
            ?uri <https://data.vlaanderen.be/ns/besluit#Agendapunt.type> ?type.
            ?type skos:prefLabel ?typeName.
         }
      }
   `;
    const result = await query(queryString);
    if (result.results.bindings.length === 0) {
      console.warn(`no agendapoints found for meeting with uuid ${meetingUuid}`);
      return [];
    }
    else {
      const agendapoints = result.results.bindings.map((binding) => new AgendaPoint(binding));
      return agendapoints.sort((a, b) => Number(a.position) > Number(b.position) ? 1 : -1);
    }
  }

  async fetchParticipationList(mandateeCache) {
    const presentQuery = await query(`
      ${prefixMap.get("besluit").toSparqlString()}
      SELECT DISTINCT * WHERE {
        ${sparqlEscapeUri(this.uri)} besluit:heeftAanwezigeBijStart ?mandatarisUri.
      }
    `);
    const present = presentQuery.results.bindings.map((binding) => mandateeCache.get(binding.mandatarisUri));
    const notPresentQuery = await query(`
      ${prefixMap.get("besluit").toSparqlString()}
      SELECT DISTINCT * WHERE {
        ${sparqlEscapeUri(this.uri)} ext:heeftAfwezigeBijStart ?mandatarisUri.
      }
    `);
    const notPresent = notPresentQuery.results.bindings.map((binding) => mandateeCache.get(binding.mandatarisUri));
    const chairmanAndSecretaryQuery = await query(`
      ${prefixMap.get("besluit").toSparqlString()}
      SELECT DISTINCT * WHERE {
        OPTIONAL {
          ${sparqlEscapeUri(this.uri)} besluit:heeftVoorzitter ?chairmanUri.
        }
        OPTIONAL {
          ${sparqlEscapeUri(this.uri)} besluit:heeftSecretaris ?secretaryUri.
        }
      }
    `);

    const chairman = mandateeCache.get(chairmanAndSecretaryQuery.results.bindings[0].chairmanUri);
    const secretary = mandateeCache.get(chairmanAndSecretaryQuery.results.bindings[0].secretaryUri);

    //If there's no information in the participation list we return undefined to make it easier to hide in the template
    if(present.length || notPresent.length || chairman || secretary) {
      return {present, notPresent, chairman, secretary};
    } else {
      return undefined;
    }
  }



  constructor({
    uri,
    title,
    position,
    plannedPublic,
    addedAfter = null,
    description = null,
    type = null,
    typeName = null
  }) {
    this.uri = uri.value;
    this.title = title.value;
    this.position = position.value;
    this.plannedPublic = plannedPublic.value === "true";
    this.addedAfter = addedAfter?.value;
    this.description = description?.value;
    this.type = type?.value;
    this.typeName = typeName?.value;
  }
}
