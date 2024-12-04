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
			const requestBody = await request.text();
			const requestParams = new URLSearchParams(requestBody);

			const userInput = requestParams.get("t");
			const debug = requestParams.get("d") === "true";

			const responseStream = toHtml(simplify(userInput, debug));

			return {
				body: Readable.from(responseStream),
				headers: { "Content-Type": "text/html;charset=utf-8" },
			}
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

const htmlTemplatePromise = readResource("template.html");

async function* toHtml(source) {
	const htmlTemplate = await htmlTemplatePromise;
	const [htmlHeader, htmlFooter] = htmlTemplate.split("{0}");

	yield htmlHeader;

	for await (const chunk of source) {
		yield chunk.replace('<', '&lt;').replace('>', '&gt;');
	}

	yield htmlFooter;
}

async function* simplify(text, debug) {
	const responseStream = getModelResponse(text);

	for await (const chunk of responseStream) {
		yield chunk || '';
		if (debug) {
			yield "\n";
		}
	}
}

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o-mini";

const systemPromptPromise = readResource("system-prompt.txt");
const userPromptPromise = readResource("user-prompt.txt");

async function* getModelResponse(userInput) {
	const client = new OpenAI({ baseURL: endpoint, apiKey: token });

	const systemPrompt = await systemPromptPromise;
	let userPrompt = await userPromptPromise;
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
	}
}

async function readResource(fileName) {
	const directory = './src/resources';
	const data = await fs.readFile(`${directory}/${fileName}`, { encoding: "utf-8" });
	return data;
}
