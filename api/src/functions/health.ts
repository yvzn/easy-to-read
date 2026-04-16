import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

app.http('health', {
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		context.log(`Http function processed request for url "${request.url}"`);

		return { body: 'Healthy' };
	},
});
