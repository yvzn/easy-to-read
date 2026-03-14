import { Router, Request, Response, NextFunction } from "express";
import { TableClient } from "@azure/data-tables";
import { randomUUID } from "crypto";

const router = Router();

router.post("/feedback", async (req: Request, res: Response, next: NextFunction) => {
	const {
		s: score,
		c: comment,
		i: interactionId,
	} = req.body as {
		s?: string;
		c?: string;
		i?: string;
	};

	if (!score || !interactionId) {
		res.status(400).type("text").send("Missing parameters.");
		return;
	}

	try {
		const connectionString =
			process.env.INTERACTIONS_STORAGE_CONNECTION_STRING;
		if (!connectionString) {
			throw new Error("Missing storage connection string.");
		}

		const client = TableClient.fromConnectionString(
			connectionString,
			"Feedbacks",
		);

		await client.createEntity({
			partitionKey: "Feedbacks",
			rowKey: randomUUID(),
			InteractionId: interactionId,
			Score: score,
			Comment: comment ?? "",
		});

		res.status(201).send();
	} catch (error) {
		next(error);
	}
});

export default router;
