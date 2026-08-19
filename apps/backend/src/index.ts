import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import authRouter from './routes/auth.js';
import agentRouter from './routes/agent.js';
import jobsRouter from './routes/jobs.js';

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN,
}));

app.use(express.json());

// Request structured logging middleware
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming Request');
  next();
});

// Basic Root Status Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mounted Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/agent', agentRouter);
app.use('/api/v1/jobs', jobsRouter);

// Listen
const port = env.PORT || 3001;
let server: any = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 VEXA Backend Server running on port ${port} in ${env.NODE_ENV} mode`);
  });
}

export { app, server };
export default app;
