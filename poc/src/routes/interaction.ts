import { Router, Request, Response, NextFunction } from "express";
import { TableClient } from "@azure/data-tables";
import { randomUUID } from "crypto";

const router = Router();

router.post("/interaction", async (req: Request, res: Response, next: NextFunction) => {
	const {
		t: input,
		o: output,
		i: interactionId,
		h: href,
	} = req.body as {
		t?: string;
		o?: string;
		i?: string;
		h?: string;
	};

	if (!input || !output || !interactionId) {
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
			"Interactions",
		);

		await client.createEntity({
			partitionKey: "Interactions",
			rowKey: randomUUID(),
			InteractionId: interactionId,
			Input: input,
			Output: output,
			Href: href ?? "",
		});

		res.status(201).send();
	} catch (error) {
		next(error);
	}
});

export default router;
