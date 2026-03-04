import express from "express";
import helmet from "helmet";
import cors from "cors";
import healthRouter from "./routes/health";
import simplifiedRouter from "./routes/simplified";
import feedbackRouter from "./routes/feedback";
import interactionRouter from "./routes/interaction";
import carbonFootprintRouter from "./routes/carbon-footprint";

const app = express();

// -- Middleware -----

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
	origin: process.env.CORS_ORIGINS?.split(",") || "http://localhost:8080",
}))

// -- Routes -----

app.use("/api", healthRouter);
app.use("/api", simplifiedRouter);
app.use("/api", feedbackRouter);
app.use("/api", interactionRouter);
app.use("/api", carbonFootprintRouter);

export default app;
