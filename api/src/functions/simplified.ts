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
			const providerName = requestParams.get('p') || 'openai';

			if (!userInput) {
				return {
					status: 400,
					headers: { 'Content-Type': 'text/plain;charset=utf-8' },
					body: 'Empty content.',
				};
			}

			const responseStream = simplify(userInput, language, streaming, providerName, debug, context);

			const response = new HttpResponse({
				body: responseStream,
				headers: {
					'Content-Type': 'text/html;charset=utf-8',
				}
			});

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

function simplify(
	text: string,
	language: string | null,
	streaming: boolean,
	providerName: string,
	debug: boolean,
	context: InvocationContext,
) {
	return new ReadableStream({
		async start(controller) {
			try {
				const [htmlHeader, htmlFooter] = await readHtmlTemplate();
				controller.enqueue(htmlHeader);

				const translationInstructions = buildTranslationInstructions(language);
				const modelProvider = getModelProvider(streaming, providerName);
				context.info(`Using provider=${modelProvider.providerName}, streaming=${modelProvider.streaming}`);
				const responseStream = await modelProvider.getResponse(text, translationInstructions);

				for await (const chunk of responseStream) {
					const content = modelProvider.cleanModelOutput(chunk);
					controller.enqueue(content);
					if (debug) {
						controller.enqueue('\n');
					}
				}

				controller.enqueue(htmlFooter);
			} catch (error) {
				context.error(error);
				controller.enqueue('<api-error>Service has failed to process the request. Please try again later.</api-error>');
			} finally {
				controller.close();
			}
		},
		cancel() {
			context.warn('Stream cancelled by the client.');
		}
	});
}





// --- Prompt Building and Template Handling ----------------------------------





const htmlTemplatePromise = readResource('template.html');

async function readHtmlTemplate() {
	const template = await htmlTemplatePromise;
	const parts = template
		.split('-----')
		.map(part => part.trim().replaceAll(/[\n\r\t]/g, ''));
	return parts;
}

const systemPromptPromise = readResource('system-prompt.txt');
const userPromptPromise = readResource('user-prompt.txt');

interface PromptPair {
	systemPrompt: string;
	userPrompt: string;
}

async function buildPrompts(userInput: string, translationInstructions: string): Promise<PromptPair> {
	const [systemPromptTemplate, userPromptTemplate] = await Promise.all([systemPromptPromise, userPromptPromise]);

	return {
		systemPrompt: systemPromptTemplate.replaceAll('{0}', translationInstructions),
		userPrompt: userPromptTemplate.replaceAll('{0}', userInput),
	};
}

function buildChatMessages(systemPrompt: string, userPrompt: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
	return [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: userPrompt },
	];
}




// --- Model Provider Abstraction ---------------------------------------------




type ModelProviderName = 'openai' | 'mistral' | 'mock';
type ModelResponseStream = AsyncIterable<unknown>;

interface ModelProvider {
	get providerName(): ModelProviderName;
	get streaming(): boolean;

	getResponse(userInput: string, translationInstructions: string): Promise<ModelResponseStream>;
	cleanModelOutput(chunk: unknown): string;
}

const modelProviderBuilders: Record<ModelProviderName, (streaming: boolean) => ModelProvider> = {
	openai: (streaming) => new OpenAIModelProvider(streaming),
	mistral: () => new MistralModelProvider(),
	mock: () => new MockModelProvider(),
};

function normalizeProvider(providerName: string): ModelProviderName {
	if (providerName === 'mistral' || providerName === 'mock' || providerName === 'openai') {
		return providerName;
	}

	return 'openai';
}

function getModelProvider(streaming: boolean, providerName: string) {
	const normalizedProvider = normalizeProvider(providerName);
	const buildProvider = modelProviderBuilders[normalizedProvider];
	return buildProvider(streaming);
}




// --- Model Provider Implementations -----------------------------------------




class OpenAIModelProvider implements ModelProvider {
	constructor(private readonly _streaming: boolean) { }

	get providerName(): ModelProviderName {
		return 'openai';
	}

	get streaming(): boolean {
		return this._streaming;
	}

	async getResponse(userInput: string, translationInstructions: string): Promise<ModelResponseStream> {
		const client = createOpenAIClient();
		const { systemPrompt, userPrompt } = await buildPrompts(userInput, translationInstructions);
		const messages = buildChatMessages(systemPrompt, userPrompt);

		if (this.streaming) {
			return client.chat.completions.create({
				messages,
				temperature: 1.0,
				max_tokens: 12000,
				model: openAIModelName,
				stream: true,
			});
		}

		const response = await client.chat.completions.create({
			messages,
			temperature: 1.0,
			max_tokens: 12000,
			model: openAIModelName,
		});

		return this.toSingleChunkStream(response.choices[0].message.content);
	}

	cleanModelOutput(chunk: unknown): string {
		return parseOpenAIChunkContent(chunk);
	}

	private toSingleChunkStream(content: string | null | undefined): ModelResponseStream {
		const chunk = {
			choices: [
				{
					delta: {
						content,
					},
				},
			],
		};

		return Readable.from([chunk]);
	}
}

class MistralModelProvider implements ModelProvider {
	get providerName(): ModelProviderName {
		return 'mistral';
	}

	get streaming(): boolean {
		return true;
	}

	async getResponse(userInput: string, translationInstructions: string): Promise<ModelResponseStream> {
		const client = createMistralClient();
		const { systemPrompt, userPrompt } = await buildPrompts(userInput, translationInstructions);

		return client.chat.stream({
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			temperature: 1.0,
			model: mistralModelName,
			stream: true,
		});
	}

	cleanModelOutput(chunk: unknown): string {
		return parseMistralChunkContent(chunk);
	}
}

class MockModelProvider implements ModelProvider {
	get providerName(): ModelProviderName {
		return 'mock';
	}

	get streaming(): boolean {
		return true;
	}

	async getResponse(userInput: string, _translationInstructions: string): Promise<ModelResponseStream> {
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

	cleanModelOutput(chunk: unknown): string {
		return parseOpenAIChunkContent(chunk);
	}
}

type OpenAIChunk = {
	choices?: Array<{
		delta?: {
			content?: string;
		};
	}>;
};

function parseOpenAIChunkContent(chunk: unknown) {
	const openAIChunk = chunk as OpenAIChunk;
	const sanitized = openAIChunk.choices?.[0]?.delta?.content;
	return typeof sanitized === 'string' ? sanitized : '';
}

type MistralStreamChunk = {
	data?: {
		choices?: Array<{
			delta?: {
				content?: string;
			};
		}>;
	};
};

function parseMistralChunkContent(chunk: unknown) {
	const mistralChunk = chunk as MistralStreamChunk;
	const sanitized = mistralChunk.data?.choices?.[0]?.delta?.content;
	return typeof sanitized === 'string' ? sanitized : '';
}





// --- Configuration and Client Creation ---------------------------------------





const openAIToken = process.env.GITHUB_TOKEN;
const openAIEndpoint = 'https://models.github.ai/inference';
const openAIModelName = 'openai/gpt-4o-mini';

function createOpenAIClient() {
	return new OpenAI({ baseURL: openAIEndpoint, apiKey: openAIToken });
}

const mistralApiKey = process.env["MISTRAL_API_KEY"];
const mistralModelName = 'ministral-3b-latest';

function createMistralClient() {
	return new Mistral({ apiKey: mistralApiKey });
}





// --- Utility Functions -----------------------------------------------------






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

async function readResource(fileName: string) {
	const directory = './src/resources';
	const data = await fs.readFile(`${directory}/${fileName}`, { encoding: 'utf-8' });
	return data;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
