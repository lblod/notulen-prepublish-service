import { app, errorHandler } from 'mu';
import { setupHandleBars } from './support/setup-handlebars';
import previewRouter from './routes/preview';
import signingRouter from './routes/signing';
import publicationRouter from './routes/publication';
import taskRouter from './routes/task';
import { statSync } from 'fs';

try {
  statSync('/share/');
} catch (e) {
  console.error(e);
  throw 'failed to detect /share folder, make sure to mount a /share folder';
}

setupHandleBars();

app.use(previewRouter);
app.use(signingRouter);
app.use(publicationRouter);
app.use(taskRouter);
app.use(errorHandler);
