// @ts-ignore
import { app, errorHandler } from 'mu';
import previewRouter from './routes/preview';
import signingRouter from './routes/signing';
import publicationRouter from './routes/publication';

app.use(previewRouter);
app.use(signingRouter);
app.use(publicationRouter);
app.use(errorHandler);
