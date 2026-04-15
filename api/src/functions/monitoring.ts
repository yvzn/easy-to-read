import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';

interface MonitoringEntity {
	PartitionKey: string;
	RowKey: string;
	Duration: string;
	Error: string | null;
}

const tableOutput = output.table({
	tableName: 'Monitoring',
	connection: 'INTERACTIONS_STORAGE_CONNECTION_STRING',
});

app.http('monitoring', {
	methods: ['POST'],
	authLevel: 'function',
	extraOutputs: [tableOutput],
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		context.log(`Http function processed request for url "${request.url}"`);

		try {
			const requestBody = await request.text();
			const requestParams = new URLSearchParams(requestBody);

			const duration = requestParams.get('d');
			const errorMessage = requestParams.get('e');

			if (!duration) {
				return {
					status: 400,
					headers: { 'Content-Type': 'text/plain;charset=utf-8' },
					body: 'Missing parameters.',
				};
			}

			const rows: MonitoringEntity[] = [];
			rows.push({
				PartitionKey: 'Healthcheck',
				RowKey: context.invocationId,
				Duration: duration,
				Error: errorMessage,
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
