const { app } = require('@azure/functions');
const OpenAI = require("openai");

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o-mini";

app.http('simplified', {
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request, context) => {
		context.info(`Http function processed request for url "${request.url}"`);

		const client = new OpenAI({ baseURL: endpoint, apiKey: token });

		const response = await client.chat.completions.create({
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: "What is the capital of France?" }
			],
			temperature: 1.0,
			top_p: 1.0,
			max_tokens: 1000,
			model: modelName
		});

		return { body: response.choices[0].message.content };
	}
});
