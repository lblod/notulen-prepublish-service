// eslint-disable-next-line no-unused-vars
import CustomVote from '../models/custom-vote';
// eslint-disable-next-line no-unused-vars
import StandardVote from '../models/standard-vote';

/**
 * @param {CustomVote | StandardVote} vote
 * @returns {vote is CustomVote}
 */
export function isCustomVote(vote) {
  return vote.type === 'customVote';
}
