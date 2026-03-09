const { app, output } = require('@azure/functions');

const tableOutput = output.table({
	tableName: 'Monitoring',
	connection: 'INTERACTIONS_STORAGE_CONNECTION_STRING',
});

app.http('monitoring', {
	methods: ['POST'],
	authLevel: 'function',
	extraOutputs: [tableOutput],
	handler: async (request, context) => {
		context.log(`Http function processed request for url "${request.url}"`);

		try {
			const requestBody = await request.text();
			const requestParams = new URLSearchParams(requestBody);

			const duration = requestParams.get("d");

			if (!duration) {
				return {
					status: 400,
					headers: { "Content-Type": "text/plain;charset=utf-8" },
					body: "Missing parameters.",
				};
			}

			const durationMs = Number(duration);
			if (!Number.isFinite(durationMs) || durationMs < 0) {
				return {
					status: 400,
					headers: { "Content-Type": "text/plain;charset=utf-8" },
					body: "Invalid parameters.",
				};
			}

			const rows = [];
			rows.push({
				PartitionKey: 'Healthcheck',
				RowKey: context.invocationId,
				Duration: durationMs,
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
