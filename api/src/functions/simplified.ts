import { app, HttpRequest, HttpResponse, HttpResponseInit, InvocationContext } from '@azure/functions';
import OpenAI from 'openai';
import { Mistral } from "@mistralai/mistralai";
import { Readable } from 'node:stream';
import fs from 'node:fs/promises';

app.http('simplified', {
	methods: ['POST'],
	authLevel: 'function',
	handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
		context.info(`Http function processed request for url "${request.url}"`);

		try {
			const requestBody = await request.text();
			const requestParams = new URLSearchParams(requestBody);

			const userInput = requestParams.get('t');
			const language = requestParams.get('l');
			const debug = requestParams.get('d') === 'true';
			const streaming = requestParams.get('s') !== 'false';
			const provider = requestParams.get('p') || 'openai';

			if (!userInput) {
				return {
					status: 400,
					headers: { 'Content-Type': 'text/plain;charset=utf-8' },
					body: 'Empty content.',
				};
			}

			const responseStream = simplify(userInput, language, streaming, provider, debug, context);

			const response = new HttpResponse({
				body: Readable.from(responseStream),
			});
			response.headers.set('Content-Type', 'text/html;charset=utf-8');

			return response;
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

function getModelProvider(streaming: boolean, provider: string) {
	const isMock = provider === 'mock';
	const isMistral = provider === 'mistral';
	const isStreaming = streaming;

	let getResponse, cleanModelOutput;

	if (isMock) {
		getResponse = getModelResponse_Mock;
	} else if (isMistral) {
		getResponse = getModelResponse_Mistral;
	} else if (isStreaming) {
		getResponse = getModelResponse_OpenAI;
	} else {
		getResponse = getModelResponse_OpenAI_NoStreaming;
	}

	if (isMistral) {
		cleanModelOutput = cleanModelOutput_Mistral;
	} else {
		cleanModelOutput = cleanModelOutput_OpenAI;
	}

	return { getResponse, cleanModelOutput };
}

async function* simplify(
	text: string,
	language: string | null,
	streaming: boolean,
	provider: string,
	debug: boolean,
	context: InvocationContext,
) {
	try {
		const [htmlHeader, htmlFooter] = await readHtmlTemplate();
		yield htmlHeader;

		const translationInstructions = buildTranslationInstructions(language);
		const { getResponse, cleanModelOutput } = getModelProvider(streaming, provider);
		const responseStream = await getResponse(text, translationInstructions);

		for await (const chunk of responseStream) {
			const content = cleanModelOutput(chunk);
			yield content;
			if (debug) {
				yield '\n';
			}
		}

		yield htmlFooter;
	} catch (error) {
		context.error(error);

		yield '<api-error>Service has failed to process the request. Please try again later.</api-error>';
	}
}

async function getModelResponse_Mock(userInput: string, _translationInstructions: string) {
	const mockChunks = [
		'<observation-1>Here is the first observation about the text.</observation-1>',
		'<version-1>Here is the first simplified version of the text.</version-1>',
		'<observation-2>Here is the second observation about the text.</observation-2>',
		`<version-2>This is a mock version of the text: ${userInput}</version-2>`,
	];

	async function* generate() {
		for (const content of mockChunks) {
			yield { choices: [{ delta: { content } }] };
			await sleep(500);
		}
	}

	return generate();
}

const htmlTemplatePromise = readResource('template.html');

async function readHtmlTemplate() {
	const template = await htmlTemplatePromise;
	const parts = template.split('-----');

	return parts;
}

const token = process.env.GITHUB_TOKEN;
const endpoint = 'https://models.github.ai/inference';
const modelName = 'openai/gpt-4o-mini';

const systemPromptPromise = readResource('system-prompt.txt');
const userPromptPromise = readResource('user-prompt.txt');

async function getModelResponse_OpenAI(userInput: string, translationInstructions: string) {
	const client = new OpenAI({ baseURL: endpoint, apiKey: token });

	let systemPrompt = await systemPromptPromise;
	systemPrompt = systemPrompt.replaceAll('{0}', translationInstructions);

	let userPrompt = await userPromptPromise;
	userPrompt = userPrompt.replaceAll('{0}', userInput);

	const stream = await client.chat.completions.create({
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		],
		temperature: 1.0,
		max_tokens: 12000,
		model: modelName,
		stream: true,
	});

	return stream;
}

async function getModelResponse_OpenAI_NoStreaming(userInput: string, translationInstructions: string) {
	const client = new OpenAI({ baseURL: endpoint, apiKey: token });

	let systemPrompt = await systemPromptPromise;
	systemPrompt = systemPrompt.replaceAll('{0}', translationInstructions);

	let userPrompt = await userPromptPromise;
	userPrompt = userPrompt.replaceAll('{0}', userInput);

	const response = await client.chat.completions.create({
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		],
		temperature: 1.0,
		max_tokens: 12000,
		model: modelName,
	});

	const chunk = {
		choices: [
			{
				delta: {
					content: response.choices[0].message.content,
				},
			},
		],
	};

	return Readable.from([chunk]);
}

const mistralApiKey = process.env["MISTRAL_API_KEY"];
const mistralModelName = 'ministral-3b-latest';

async function getModelResponse_Mistral(userInput: string, translationInstructions: string) {
	const client = new Mistral({ apiKey: mistralApiKey });

	let systemPrompt = await systemPromptPromise;
	systemPrompt = systemPrompt.replaceAll("{0}", translationInstructions);

	let userPrompt = await userPromptPromise;
	userPrompt = userPrompt.replaceAll("{0}", userInput);

	const stream = await client.chat.stream({
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
		temperature: 1.0,
		model: mistralModelName,
		stream: true
	});

	return stream;
}

function buildTranslationInstructions(language: string | null) {
	switch (language) {
		case 'es':
			return 'Make sure to write the new version in Spanish, even if the original text is in another language.';
		case 'fr':
			return 'Make sure to write the new version in French, even if the original text is in another language.';
		case 'de':
			return 'Make sure to write the new version in German, even if the original text is in another language.';
		case 'en':
			return 'Make sure to write the new version in English, even if the original text is in another language.';
		default:
			return 'Write the new version in the same language as the original text.';
	}
}

function cleanModelOutput_OpenAI(chunk: OpenAI.Chat.Completions.ChatCompletionChunk) {
	const sanitized = chunk.choices[0]?.delta?.content || '';
	return sanitized;
}

function cleanModelOutput_Mistral(chunk: any) {
	const sanitized = chunk.data.choices[0]?.delta?.content || '';
	return sanitized;
}

async function readResource(fileName: string) {
	const directory = './src/resources';
	const data = await fs.readFile(`${directory}/${fileName}`, { encoding: 'utf-8' });
	return data;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
