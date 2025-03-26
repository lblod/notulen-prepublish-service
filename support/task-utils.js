// @ts-strict-ignore

/** @import { Response } from 'express' */
import Task from '../models/task.js';
/** @import Meeting from '../models/meeting' */

/**
 * @param {Meeting} meeting
 * @param {string} taskType
 * @param {string} [userUri]
 * */
export async function ensureTask(meeting, taskType, userUri) {
  let task = userUri
    ? await Task.query({ meetingUri: meeting.uri, type: taskType, userUri })
    : await Task.query({ meetingUri: meeting.uri, type: taskType });
  if (!task) {
    task = await Task.create(meeting, taskType, userUri);
  }
  return task;
}

/**
 * @param {Response} res
 * @param {Meeting} meeting
 * @param {string} taskType
 * @param {string} [userUri]
 * */
export async function returnEnsuredTaskId(res, meeting, taskType, userUri) {
  const task = await ensureTask(meeting, taskType, userUri);

  res.status(202).json({
    data: {
      id: task.id,
      status: 'accepted',
      type: task.type,
    },
  });

  return task;
}
