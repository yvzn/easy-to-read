const { app, output, input } = require('@azure/functions');

const tableOutput = output.table({
	tableName: 'CarbonFootprint',
	connection: 'INTERACTIONS_STORAGE_CONNECTION_STRING',
});

app.http('carbon-footprint', {
	methods: ['POST'],
	authLevel: 'function',
	extraOutputs: [tableOutput],
	handler: async (request, context) => {
		context.log(`Http function processed request for url "${request.url}"`);

		try {
			const requestBody = await request.text();
			const requestParams = new URLSearchParams(requestBody);

			const userInputLength = requestParams.get("ul");
			const userInputWordCount = requestParams.get("uw");
			const simplifiedOutputLength = requestParams.get("sl");
			const simplifiedOutputWordCount = requestParams.get("sw");
			const duration = requestParams.get("d");
			const interactionId = requestParams.get("i");

			if ([userInputLength, userInputWordCount, simplifiedOutputLength, simplifiedOutputWordCount, duration, interactionId].some(param => !param)) {
				return {
					status: 400,
					headers: { "Content-Type": "text/plain;charset=utf-8" },
					body: "Missing parameters.",
				};
			}

			const rows = [];
			rows.push({
				PartitionKey: 'Carbon',
				RowKey: context.invocationId,
				InteractionId: interactionId,
				UserInputLength: userInputLength,
				UserInputWordCount: userInputWordCount,
				SimplifiedOutputLength: simplifiedOutputLength,
				SimplifiedOutputWordCount: simplifiedOutputWordCount,
				Duration: duration,
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
