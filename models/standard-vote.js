// @ts-strict-ignore

import { sparqlEscapeUri, query } from 'mu';
/** @import { BindingObject } from 'mu' */
import { prefixMap } from '../support/prefixes';
import { whoVotesBasedOnClassifcationMap } from '../support/classification-utils';
import { sortMandatees } from '../support/query-utils';

export default class StandardVote {
  static async findAll({ treatmentUri }) {
    try {
      const result = await query(`
         ${prefixMap['besluit'].toSparqlString()}
         ${prefixMap['schema'].toSparqlString()}
         ${prefixMap['dct'].toSparqlString()}
         ${prefixMap['mandaat'].toSparqlString()}
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
          ${sparqlEscapeUri(treatmentUri)} dct:subject ?agendapuntUri.
          ?zittingUri besluit:behandelt ?agendapuntUri.
          ?zittingUri besluit:isGehoudenDoor ?adminBodyUri.
          ?adminBodyUri mandaat:isTijdspecialisatieVan ?mainBestuursorgaanUri.
          ?mainBestuursorgaanUri besluit:classificatie ?adminBodyClassification.
          OPTIONAL { ?uri schema:position ?position. }
        } ORDER BY ASC(?position)
      `);
      return result.results.bindings.map((binding) =>
        StandardVote.fromBinding(binding)
      );
    } catch (e) {
      console.log(e);
      throw `failed to fetch standard votes for treatment ${treatmentUri}`;
    }
  }

  /** @param {BindingObject} bound */
  static fromBinding({
    uri,
    subject,
    result,
    isSecret,
    positiveVotes,
    negativeVotes,
    abstentionVotes,
    position,
    adminBodyClassification,
  }) {
    return new StandardVote({
      uri: uri.value,
      subject: subject.value,
      result: result.value,
      isSecret: isSecret.value === 'true',
      isUnanimous:
        (Number(positiveVotes.value) === 0 ||
          Number(negativeVotes.value) === 0) &&
        Number(abstentionVotes.value) === 0,
      positiveVotes: positiveVotes.value,
      negativeVotes: negativeVotes.value,
      abstentionVotes: abstentionVotes.value,
      position: position?.value,
      adminBodyClassification: adminBodyClassification?.value,
    });
  }

  constructor({
    uri,
    subject,
    result,
    isSecret,
    isUnanimous,
    positiveVotes,
    negativeVotes,
    abstentionVotes,
    position,
    adminBodyClassification,
  }) {
    this.type = 'standardVote';
    this.uri = uri;
    this.subject = subject;
    this.result = result;
    this.isSecret = isSecret;
    this.isUnanimous = isUnanimous;
    this.positiveVotes = positiveVotes;
    this.negativeVotes = negativeVotes;
    this.abstentionVotes = abstentionVotes;
    this.position = position;
    this.adminBodyClassification = adminBodyClassification;
    this.whoVotesPhrase =
      whoVotesBasedOnClassifcationMap[adminBodyClassification];
  }

  async fetchVoters(participantCache) {
    const attendeesQuery = await query(`
  ${prefixMap['besluit'].toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftAanwezige ?mandatarisUri.
    }
  `);
    this.attendees = await Promise.all(
      attendeesQuery.results.bindings.map((binding) =>
        participantCache.get(binding.mandatarisUri.value)
      )
    );
    this.attendees = sortMandatees(this.attendees);
    const votersQuery = await query(`
  ${prefixMap['besluit'].toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftStemmer ?mandatarisUri.
    }
  `);
    this.voters = await Promise.all(
      votersQuery.results.bindings.map((binding) =>
        participantCache.get(binding.mandatarisUri.value)
      )
    );
    this.voters = sortMandatees(this.voters);
    const positiveVotersQuery = await query(`
  ${prefixMap['besluit'].toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftVoorstander ?mandatarisUri.
    }
  `);
    this.positiveVoters = await Promise.all(
      positiveVotersQuery.results.bindings.map((binding) =>
        participantCache.get(binding.mandatarisUri.value)
      )
    );
    this.positiveVoters = sortMandatees(this.positiveVoters);
    const negativeVotersQuery = await query(`
  ${prefixMap['besluit'].toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftTegenstander ?mandatarisUri.
    }
  `);
    this.negativeVoters = await Promise.all(
      negativeVotersQuery.results.bindings.map((binding) =>
        participantCache.get(binding.mandatarisUri.value)
      )
    );
    this.negativeVoters = sortMandatees(this.negativeVoters);
    const abstentionVotersQuery = await query(`
  ${prefixMap['besluit'].toSparqlString()}
    SELECT DISTINCT * WHERE {
      ${sparqlEscapeUri(this.uri)} besluit:heeftOnthouder ?mandatarisUri.
    }
  `);
    this.abstentionVoters = await Promise.all(
      abstentionVotersQuery.results.bindings.map((binding) =>
        participantCache.get(binding.mandatarisUri.value)
      )
    );
    this.abstentionVoters = sortMandatees(this.abstentionVoters);
  }
}
