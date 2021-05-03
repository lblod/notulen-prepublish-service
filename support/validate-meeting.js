const errorMessages = {
  nl: {
    meetingPlannedStartRequired: "De geplande start datum van de zitting is vereist.",
    meetingStartRequired: "De startdatum van de zitting is vereist.",
    meetingEndRequired: "De einddatum van de zitting is vereist.",
  }
};

export default function validateMeeting(meeting) {
  const errors = [];
  if(!meeting.plannedStart) {
    errors.push(errorMessages.nl.meetingPlannedStartRequired);
  }
  if(!meeting.startedAt) {
    errors.push(errorMessages.nl.startedAt);
  }
  if(!meeting.endedAt) {
    errors.push(errorMessages.nl.meetingEndRequired);
  }
  console.log(errors);
  return errors;
}
