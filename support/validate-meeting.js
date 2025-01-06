/**
 * @import Meeting from '../models/meeting'
 */

const errorMessages = {
  nl: {
    meetingPlannedStartRequired:
      'De geplande start datum van de zitting is vereist.',
    meetingStartRequired: 'De startdatum van de zitting is vereist.',
    meetingEndRequired: 'De einddatum van de zitting is vereist.',
  },
};

/**
 *
 * @param {Meeting} meeting
 * @returns {string[]}
 */
export default function validateMeeting(meeting) {
  const errors = [];
  if (!meeting.plannedStart) {
    errors.push(errorMessages.nl.meetingPlannedStartRequired);
  }
  if (!meeting.startedAt) {
    errors.push(errorMessages.nl.meetingStartRequired);
  }
  if (!meeting.endedAt) {
    errors.push(errorMessages.nl.meetingEndRequired);
  }
  return errors;
}
