import express from 'express';
import Task from '../models/task';

const router = express.Router();

router.get('/publication-tasks/:id', async function (req, res) {
  const taskUuid = req.params.id;
  const task = await Task.find(taskUuid);
  if (task) {
    res.status(200).send({
      data: {
        id: task.id,
        uri: task.uri,
        status: task.status,
        type: task.type,
        created: task.created,
        modified: task.modified,
        involves: task.involves,
        taskType: task.type,
        error: task.error
          ? {
              id: task.error.id,
              message: task.error.message,
              uri: task.error.uri,
            }
          : undefined,
      },
    });
  } else {
    res.status(404).send(`task with id ${taskUuid} was not found`);
  }
});

export default router;
