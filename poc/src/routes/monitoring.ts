import { Router, Request, Response } from "express";
import { TableClient } from "@azure/data-tables";
import { randomUUID } from "crypto";

const router = Router();

router.post("/monitoring", async (req: Request, res: Response) => {
	const {
		d: duration,
		e: errorMessage,
	} = req.body as {
		d?: string;
		e?: string;
	};

	if (!duration) {
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
			"Monitoring",
		);

		await client.createEntity({
			partitionKey: "Healthcheck",
			rowKey: randomUUID(),
			Duration: duration,
			Error: errorMessage,
		});

		res.status(201).send();
	} catch (error) {
		console.error(error);
		res.status(503)
			.type("text")
			.send(
				"Service has failed to process the request. Please try again later.",
			);
	}
});

export default router;
