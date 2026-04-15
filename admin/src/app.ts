import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { engine } from "express-handlebars";
import { config } from "./config/index.js";
import router from "./routes/index.js";

const app = express();

// Security middleware
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", "data:"],
			},
		},
	}),
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
	if (req.method === "POST") {
		postLimiter(req, res, next);
	} else {
		next();
	}
});

// View engine
app.engine(
	"hbs",
	engine({
		extname: ".hbs",
		defaultLayout: false,
	}),
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "..", "views"));

// Static assets
app.use(express.static(path.join(__dirname, "..", "public")));

// Expose current path to all views for active sidebar state
app.use((req: Request, res: Response, next: NextFunction) => {
	res.locals.currentPath = req.path;
	const now = new Date();
	res.locals.currentYear = now.getFullYear();
	res.locals.todayDate = now.toISOString().split("T")[0];
	const isInteractions = req.path === "/interactions" || req.path.startsWith("/interactions/");
	const navItem = (active: boolean) => ({
		active,
		linkClass: active ? "bg-blue-50 text-blue-700" : "text-gray-900",
		iconClass: active ? "text-blue-700" : "text-gray-500 group-hover:text-gray-900",
		textClass: active ? "font-semibold text-blue-700" : "",
	});
	res.locals.nav = {
		dashboard: navItem(req.path === "/"),
		usageStats: navItem(req.path === "/usage-stats"),
		interactions: navItem(isInteractions),
		feedback: navItem(req.path === "/feedback"),
		monitoring: navItem(req.path === "/monitoring"),
		maintenance: navItem(req.path === "/maintenance"),
	};
	next();
});

// Routes
app.use(router);

// 404 handler
app.use((_req: Request, res: Response) => {
	res.status(404).render("error", { message: "Page not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error(err.stack);
	const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
	res.status(statusCode).render("error", {
		message: config.nodeEnv === "development" ? err.message : "An unexpected error occurred",
	});
});

export default app;
