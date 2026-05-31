/** @import { Response } from 'express' */
import Task from '../models/task.js';
import AppError from './error-utils.js';
/** @import Meeting from '../models/meeting' */

/**
 * @param {Meeting} meeting
 * @param {string} taskType
 * @param {string} [userUri]
 * */
export async function ensureTask(meeting, taskType, userUri) {
  /** @type {Task | null} */
  let task = null;
  if (!task) {
    task = await Task.create(meeting, taskType, userUri);
  }
  if (!task) {
    throw new AppError(500, 'Unable to create task');
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
