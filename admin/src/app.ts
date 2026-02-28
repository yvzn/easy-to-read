import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/index.js';
import router from './routes/index.js';

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// CORS: same-origin only (no external origins)
app.use(cors({ origin: false }));

// Rate limit for POST endpoints
const postLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Apply rate limiter to POST routes
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST') {
    postLimiter(req, res, next);
  } else {
    next();
  }
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use(router);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).render('error', {
    message:
      config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
  });
});

export default app;
