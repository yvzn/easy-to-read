const { app, HttpResponse } = require('@azure/functions');
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
			const streaming = requestParams.get("s") !== "false";

			if (!userInput) {
				return {
					status: 400,
					headers: { "Content-Type": "text/plain;charset=utf-8" },
					body: "Empty content.",
				};
			}

			const responseStream = simplify(userInput, language, streaming, debug, context);

			const response = new HttpResponse({
				body: Readable.from(responseStream),
			});
			response.headers.set("Content-Type", "text/html;charset=utf-8");

			return response;
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

async function* simplify(text, language, streaming, debug, context) {
	try {
		const [htmlHeader, htmlFooter] = await readHtmlTemplate();
		yield htmlHeader;

		const translationInstructions = buildTranslationInstructions(language);

		const responseStream = streaming
			? await getModelResponse(text, translationInstructions)
			: await getModelResponse_NoStreaming(text, translationInstructions);

		await getModelResponse(text, translationInstructions);
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

async function* _simplifyMock(text, _language, _streaming, debug, context) {
	try {
		const [htmlHeader, htmlFooter] = await readHtmlTemplate();
		yield htmlHeader;

		const mockResponse = [
			"<observation-1>Here is the first observation about the text.</observation-1>",
			"<version-1>Here is the first simplified version of the text.</version-1>",
			"<observation-2>Here is the second observation about the text.</observation-2>",
			`<version-2>${text}</version-2>`,
		]

		for (let chunk of mockResponse) {
			yield chunk;
			if (debug) {
				yield "\n";
			}
			await sleep(500);
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
		max_tokens: 12000,
		model: modelName,
		stream: true
	});

	return stream;
}

async function getModelResponse_NoStreaming(userInput, translationInstructions) {
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
		max_tokens: 12000,
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

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
