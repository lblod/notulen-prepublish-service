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
        status: task.status,
        type: task.type,
        taskType: task.type,
      }
    });
  }
  else {
    res.status(404).send(`task with id ${taskUuid} was not found`);
  }
});


export default router;
