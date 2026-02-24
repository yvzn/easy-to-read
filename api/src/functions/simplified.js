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
			const language = requestParams.get("l");
			const debug = requestParams.get("d") === "true";

			if (!userInput) {
				return {
					status: 400,
					headers: { "Content-Type": "text/plain;charset=utf-8" },
					body: "Empty content.",
				};
			}

			const responseStream = simplify(userInput, language, debug, context);

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


async function* simplify(text, language, debug, context) {
	try {
		const [htmlHeader, htmlFooter] = await readHtmlTemplate();
		yield htmlHeader;

		const translationInstructions = buildTranslationInstructions(language);

		const responseStream = await getModelResponse(text, translationInstructions);
		for await (let chunk of responseStream) {
			chunk = cleanModelOutput(chunk);

			yield chunk;
			if (debug) {
				yield "\n";
			}
		}

		yield htmlFooter;
	}
	catch (error) {
		context.error(error);

		yield '<api-error>Service has failed to process the request. Please try again later.</api-error>';
	}
}

const htmlTemplatePromise = readResource("template.html");

async function readHtmlTemplate() {
	const template = await htmlTemplatePromise;
	const parts = template.split("-----");

	return parts;
}

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const modelName = "openai/gpt-4o-mini";

const systemPromptPromise = readResource("system-prompt.txt");
const userPromptPromise = readResource("user-prompt.txt");

async function getModelResponse(userInput, translationInstructions) {
	const client = new OpenAI({ baseURL: endpoint, apiKey: token });

	let systemPrompt = await systemPromptPromise;
	systemPrompt = systemPrompt.replace("{0}", translationInstructions);

	let userPrompt = await userPromptPromise;
	userPrompt = userPrompt.replace("{0}", userInput);

	const stream = await client.chat.completions.create({
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
		temperature: 1.0,
		max_tokens: 8000,
		model: modelName,
		stream: true
	});

	return stream;
}

async function getRawModelResponse(userInput, translationInstructions) {
	const client = new OpenAI({ baseURL: endpoint, apiKey: token });

	let systemPrompt = await systemPromptPromise;
	systemPrompt = systemPrompt.replace("{0}", translationInstructions);

	let userPrompt = await userPromptPromise;
	userPrompt = userPrompt.replace("{0}", userInput);

	const response = await client.chat.completions.create({
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
		temperature: 1.0,
		max_tokens: 8000,
		model: modelName,
	});

	const chunk = {
		choices: [
			{
				delta: {
					content: response.choices[0].message.content
				}
			}
		]
	}

	return Readable.from([chunk]);
}

function buildTranslationInstructions(language) {
	switch (language) {
		case 'es':
			return 'The new versions should be translated into Spanish.';
		case 'fr':
			return 'The new versions should be translated into French.';
		case 'de':
			return 'The new versions should be translated into German.';
		case 'en':
			return 'The new versions should be translated into English.';
		default:
			return 'The new versions should be in the same language.';
	}
}

function cleanModelOutput(chunk) {
	const sanitized = chunk.choices[0]?.delta?.content || '';
	return sanitized;
}

async function readResource(fileName) {
	const directory = './src/resources';
	const data = await fs.readFile(`${directory}/${fileName}`, { encoding: "utf-8" });
	return data;
}
