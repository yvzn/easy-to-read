import { Router, Request, Response } from 'express';
import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/carbon-footprint', async (req: Request, res: Response) => {
	const {
		ul: userInputLength,
		uw: userInputWordCount,
		sl: simplifiedOutputLength,
		sw: simplifiedOutputWordCount,
		d: duration,
		i: interactionId,
	} = req.body as {
		ul?: string;
		uw?: string;
		sl?: string;
		sw?: string;
		d?: string;
		i?: string;
	};

	if (
		!userInputLength ||
		!userInputWordCount ||
		!simplifiedOutputLength ||
		!simplifiedOutputWordCount ||
		!duration ||
		!interactionId
	) {
		res.status(400).type('text').send('Missing parameters.');
		return;
	}

	try {
		const connectionString =
			process.env.INTERACTIONS_STORAGE_CONNECTION_STRING;
		if (!connectionString) {
			throw new Error('Missing storage connection string.');
		}

		const client = TableClient.fromConnectionString(
			connectionString,
			'CarbonFootprint',
		);

		await client.createEntity({
			partitionKey: 'Carbon',
			rowKey: randomUUID(),
			InteractionId: interactionId,
			UserInputLength: userInputLength,
			UserInputWordCount: userInputWordCount,
			SimplifiedOutputLength: simplifiedOutputLength,
			SimplifiedOutputWordCount: simplifiedOutputWordCount,
			Duration: duration,
		});

		res.status(201).send();
	} catch (error) {
		console.error(error);
		res.status(503)
			.type('text')
			.send(
				'Service has failed to process the request. Please try again later.',
			);
	}
});

export default router;
