import express from 'express';
import helmet from 'helmet';
import healthRouter from './routes/health';
import simplifiedRouter from './routes/simplified';
import feedbackRouter from './routes/feedback';
import interactionRouter from './routes/interaction';
import carbonFootprintRouter from './routes/carbon-footprint';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', healthRouter);
app.use('/api', simplifiedRouter);
app.use('/api', feedbackRouter);
app.use('/api', interactionRouter);
app.use('/api', carbonFootprintRouter);

export default app;
