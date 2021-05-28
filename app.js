// @ts-ignore
import { app, errorHandler } from 'mu';
import setupHandleBars from './support/setup-handlebars';
import previewRouter from './routes/preview';
import signingRouter from './routes/signing';
import publicationRouter from './routes/publication';

setupHandleBars();

app.use(previewRouter);
app.use(signingRouter);
app.use(publicationRouter);
app.use(errorHandler);
