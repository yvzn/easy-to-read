import { Router, Request, Response } from 'express';
import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/feedback', async (req: Request, res: Response) => {
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
			'Feedbacks',
		);

		await client.createEntity({
			partitionKey: 'Feedbacks',
			rowKey: randomUUID(),
			InteractionId: interactionId,
			Score: score,
			Comment: comment ?? '',
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
