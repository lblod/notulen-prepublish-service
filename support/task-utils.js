// @ts-strict-ignore

import Task from '../models/task';

/**
 * @param meeting
 * @param {string} taskType
 * @param {string} [userUri]
 * */
export async function ensureTask(meeting, taskType, userUri) {
  let task = userUri
    ? await Task.query({ meetingUri: meeting.uri, type: taskType, userUri })
    : await Task.query({ meetingUri: meeting.uri, type: taskType });
  if (!task) {
    task = await Task.create(meeting, taskType);
  }
  return task;
}
