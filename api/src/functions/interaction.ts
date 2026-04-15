import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';

interface InteractionEntity {
	PartitionKey: string;
	RowKey: string;
	InteractionId: string;
	Input: string;
	Output: string;
	Href: string | null;
}

const tableOutput = output.table({
	tableName: 'Interactions',
	connection: 'INTERACTIONS_STORAGE_CONNECTION_STRING',
});

app.http('interaction', {
	methods: ['POST'],
	authLevel: 'function',
	extraOutputs: [tableOutput],
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		context.log(`Http function processed request for url "${request.url}"`);

		try {
			const requestBody = await request.text();
			const requestParams = new URLSearchParams(requestBody);

			const inputText = requestParams.get('t');
			const outputText = requestParams.get('o');
			const interactionId = requestParams.get('i');
			const href = requestParams.get('h');

			if (!inputText || !outputText || !interactionId) {
				return {
					status: 400,
					headers: { 'Content-Type': 'text/plain;charset=utf-8' },
					body: 'Missing parameters.',
				};
			}

			const rows: InteractionEntity[] = [];
			rows.push({
				PartitionKey: 'Interactions',
				RowKey: context.invocationId,
				InteractionId: interactionId,
				Input: inputText,
				Output: outputText,
				Href: href,
			});
			context.extraOutputs.set(tableOutput, rows);

			return { status: 201 };
		} catch (error) {
			context.error(error);

			return {
				status: 503,
				headers: { 'Content-Type': 'text/plain;charset=utf-8' },
				body: 'Service has failed to process the request. Please try again later.',
			};
		}
	},
});
