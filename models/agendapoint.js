import {prefixMap} from "../support/prefixes";
import {query, sparqlEscapeString} from "mu";

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
            ?uri <http://data.vlaanderen.be/ns/besluit#Agendapunt.type> ?type.
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
      const agendapoints = result.results.bindings.map((binding) => AgendaPoint.fromBinding(binding));
      return agendapoints.sort((a, b) => Number(a.position) > Number(b.position) ? 1 : -1);
    }
  }

  static fromBinding({
    uri,
    title,
    position,
    plannedPublic,
    addedAfter = null,
    description = null,
    type = null,
    typeName = null
  }) {
    return new AgendaPoint({
      uri: uri.value,
      title: title.value,
      position: position.value,
      plannedPublic: plannedPublic.value === "true",
      addedAfter: addedAfter?.value,
      description: description?.value,
      type: type?.value,
      typeName: typeName?.value
    });
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
    this.uri = uri;
    this.title = title;
    this.position = position;
    this.plannedPublic = plannedPublic;
    this.addedAfter = addedAfter;
    this.description = description;
    this.type = type;
    this.typeName = typeName;
  }
}
