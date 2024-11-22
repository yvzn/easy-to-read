const { app } = require('@azure/functions');
const OpenAI = require("openai");
const { Readable } = require('node:stream');

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o-mini";

app.http('simplified', {
	methods: ['POST'],
	authLevel: 'function',
	handler: async (request, context) => {
		context.info(`Http function processed request for url "${request.url}"`);

		try {
			const chunks = await ask();

			return {
				body: Readable.from(chunks),
				headers: { "Content-Type": "text/plain" },
			}
		} catch (error) {
			context.error(error);

			return {
				status: 503,
				body: "Service has failed to process the request. Please try again later.",
			};
		}
	}
});

async function* ask() {
	const client = new OpenAI({ baseURL: endpoint, apiKey: token });

	const stream = await client.chat.completions.create({
		messages: [
			{ role: "system", content: "You are a helpful assistant." },
			{ role: "user", content: "Give me 5 good reasons why I should exercise every day." },
		],
		temperature: 1.0,
		top_p: 1.0,
		max_tokens: 1000,
		model: modelName,
		stream: true
	});

	for await (const part of stream) {
		yield part.choices[0]?.delta?.content || '';
		yield '|';
	}
}

