/** @import { Response } from 'express' */
import Task from '../models/task.js';
/** @import Meeting from '../models/meeting' */

/**
 * @deprecated This function is now just a wrapper around `Task.create()`
 * @param {Meeting} meeting
 * @param {string} taskType
 * @param {string} [userUri]
 * */
export async function ensureTask(meeting, taskType, userUri) {
  return Task.create(meeting, taskType, userUri);
}

/**
 * @param {Response} res
 * @param {Meeting} meeting
 * @param {string} taskType
 * @param {string} [userUri]
 * */
export async function returnEnsuredTaskId(res, meeting, taskType, userUri) {
  const task = await Task.create(meeting, taskType, userUri);

  res.status(202).json({
    data: {
      id: task.id,
      status: 'accepted',
      type: task.type,
    },
  });

  return task;
}
