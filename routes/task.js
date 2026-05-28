import express from 'express';
import Task, { TASK_TYPE_SIGNING_VERSIONED_TREATMENT } from '../models/task.js';
import SignedResource from '../models/signed-resource.js';

const router = express.Router();

router.get('/publication-tasks/:id', async function (req, res, next) {
  const taskUuid = req.params.id;
  try {
    const task = await Task.find(taskUuid);
    let payload;
    if (
      task.type === TASK_TYPE_SIGNING_VERSIONED_TREATMENT &&
      task.createdResource
    ) {
      // TODO we could probably do more sanity checking here as if the signed resource does not
      // exist this will fail
      const signedResource = await SignedResource.findURI(task.createdResource);
      payload = signedResource.toMuResourceModel();
    }
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
        payload,
        error: task.error
          ? {
              id: task.error.id,
              message: task.error.message,
              uri: task.error.uri,
            }
          : undefined,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
