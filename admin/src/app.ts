import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { engine } from 'express-handlebars';
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
app.engine(
	'hbs',
	engine({
		extname: '.hbs',
		defaultLayout: false,
		helpers: {
			eq: (a: unknown, b: unknown) => a === b,
			or: (a: unknown, b: unknown) => Boolean(a || b),
			startsWith: (value: unknown, prefix: string) =>
				typeof value === 'string' && value.startsWith(prefix),
			ternary: (condition: unknown, truthy: string, falsy: string) => (condition ? truthy : falsy),
			toggleSort: (sort: unknown) => (sort === 'asc' ? 'desc' : 'asc'),
			pluralSuffix: (count: unknown) => (Number(count) === 1 ? '' : 's'),
			encodeURIComponent: (value: unknown) => encodeURIComponent(String(value ?? '')),
			jsonMap: (items: unknown, key: string) =>
				JSON.stringify(
					Array.isArray(items)
						? items.map((item) =>
								item && typeof item === 'object'
									? (item as Record<string, unknown>)[key]
									: undefined
							)
						: []
				),
			lower: (value: unknown) => String(value ?? '').toLowerCase(),
			sortedBySort: (items: unknown, sort: unknown) =>
				Array.isArray(items) && sort === 'asc'
					? items
					: Array.isArray(items)
						? [...items].reverse()
						: [],
			gt: (a: unknown, b: unknown) => Number(a) > Number(b),
			currentYear: () => new Date().getFullYear(),
			todayDate: () => new Date().toISOString().split('T')[0],
			buildFeedbackSortHref: (filter: unknown, sort: unknown) => {
				const query = new URLSearchParams();
				const safeFilter = typeof filter === 'string' ? filter : '';
				if (safeFilter) {
					query.set('filter', safeFilter);
				}
				query.set('sort', sort === 'asc' ? 'desc' : 'asc');
				return `/feedback?${query.toString()}`;
			},
		},
	})
);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '..', 'views'));

// Static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Expose current path to all views for active sidebar state
app.use((req: Request, res: Response, next: NextFunction) => {
	res.locals.currentPath = req.path;
	next();
});

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
		message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
	});
});

export default app;
