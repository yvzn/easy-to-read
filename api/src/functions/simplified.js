const { app } = require('@azure/functions');
const OpenAI = require("openai");
const { Readable } = require('node:stream');
const fs = require('node:fs/promises');

app.http('simplified', {
	methods: ['POST'],
	authLevel: 'function',
	handler: async (request, context) => {
		context.info(`Http function processed request for url "${request.url}"`);

		try {
			const input = await request.text();

			const chunks = await getChatResponse(input);

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

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o-mini";

async function* getChatResponse(userInput) {
	const client = new OpenAI({ baseURL: endpoint, apiKey: token });

	const systemPrompt = await readResource("system-prompt.txt");
	let userPrompt = await readResource("user-prompt.txt");
	userPrompt = userPrompt.replace("{0}", userInput);

	const stream = await client.chat.completions.create({
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
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

async function readResource(fileName) {
	const directory = './src/resources';
	const data = await fs.readFile(`${directory}/${fileName}`, { encoding: "utf-8" });
	return data;
}
