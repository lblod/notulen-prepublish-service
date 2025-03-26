// eslint-disable-next-line no-unused-vars
import CustomVote from '../models/custom-vote.js';
// eslint-disable-next-line no-unused-vars
import StandardVote from '../models/standard-vote.js';

/**
 * @param {CustomVote | StandardVote} vote
 * @returns {vote is CustomVote}
 */
export function isCustomVote(vote) {
  return vote.type === 'customVote';
}
