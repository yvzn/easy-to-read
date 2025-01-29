const { app, output } = require('@azure/functions');

const tableOutput = output.table({
	tableName: 'Feedbacks',
	connection: 'INTERACTIONS_STORAGE_CONNECTION_STRING',
});

app.http('feedback', {
	methods: ['POST'],
	authLevel: 'function',
	extraOutputs: [tableOutput],
	handler: async (request, context) => {
		context.log(`Http function processed request for url "${request.url}"`);

		try {
			const requestBody = await request.text();
			const requestParams = new URLSearchParams(requestBody);

			const feedbackScore = requestParams.get("s");
			const interactionId = requestParams.get("i");

			if (!feedbackScore || !interactionId) {
				return {
					status: 400,
					headers: { "Content-Type": "text/plain;charset=utf-8" },
					body: "Missing parameters.",
				};
			}

			const rows = [];
			rows.push({
				PartitionKey: 'Feedbacks',
				RowKey: context.invocationId,
				InteractionId: interactionId,
				Score: feedbackScore,
			});
			context.extraOutputs.set(tableOutput, rows);

			return { status: 201 };
		} catch (error) {
			context.error(error);

			return {
				status: 503,
				headers: { "Content-Type": "text/plain;charset=utf-8" },
				body: "Service has failed to process the request. Please try again later.",
			};
		}
	}
});
