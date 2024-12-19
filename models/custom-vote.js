// @ts-strict-ignore

import { prefixMap } from '../support/prefixes';
import { sparqlEscapeUri, query } from 'mu';

export default class CustomVote {
  static async findAll({ treatmentUri }) {
    try {
      const result = await query(`
         ${prefixMap['besluit'].toSparqlString()}
         ${prefixMap['schema'].toSparqlString()}
         ${prefixMap['ext'].toSparqlString()}
         ${prefixMap['pav'].toSparqlString()}
         ${prefixMap['gn'].toSparqlString()}
         SELECT DISTINCT * WHERE {
           ${sparqlEscapeUri(treatmentUri)} a besluit:BehandelingVanAgendapunt;
            gn:heeftAangepasteStemming ?uri.
          ?uri a gn:AangepasteStemming;
            schema:position ?position;
            ext:votingDocument ?documentContainer.
          ?documentContainer pav:hasCurrentVersion ?editorDocument .
          ?editorDocument ext:editorDocumentContent ?content;
            ext:editorDocumentContext ?context.
         }ORDER BY ASC(?position)
      `);
      return result.results.bindings.map((binding) =>
        CustomVote.fromBinding(binding)
      );
    } catch (e) {
      console.log(e);
      throw `failed to fetch custom votes for treatment ${treatmentUri}`;
    }
  }

  /** @param {import('mu').BindingObject} bound */
  static fromBinding({ uri, position, content, context }) {
    return new CustomVote({
      uri: uri.value,
      position: position.value,
      content: content.value,
      context: context.value,
    });
  }

  constructor({ uri, position, content, context }) {
    this.type = 'customVote';
    this.uri = uri;
    this.position = position;
    this.content = content;
    this.context = context;
  }
}
