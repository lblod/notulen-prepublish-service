import { prefixMap } from '../support/prefixes';
// @ts-ignore
import { sparqlEscapeUri, query } from 'mu';
import { whoVotesBasedOnClassifcationMap } from '../support/classification-utils';
import { sortMandatees } from '../support/query-utils';

export default class CustomVote {
  static async findAll({ treatmentUri }) {
    try {
      const result = await query(`
         ${prefixMap.get('besluit').toSparqlString()}
         ${prefixMap.get('schema').toSparqlString()}
         ${prefixMap.get('ext').toSparqlString()}
         ${prefixMap.get('pav').toSparqlString()}
         ${prefixMap.get('gn').toSparqlString()}
         SELECT DISTINCT * WHERE {
           ${sparqlEscapeUri(treatmentUri)} a besluit:BehandelingVanAgendapunt;
                                            besluit:heeftStemming ?uri.
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

  static fromBinding({
    uri,
    position,
    content,
    context
  }) {
    return new CustomVote({
      uri: uri.value,
      position: position.value,
      content: content.value,
      context: context.value,
    });
  }

  constructor({
    uri,
    position,
    content,
    context
  }) {
    this.type = 'customVote'
    this.isCustomVote = true;
    this.uri = uri;
    this.position = position;
    this.content = content;
    this.context = context;
  }
}
