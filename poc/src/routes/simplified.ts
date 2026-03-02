import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import OpenAI from 'openai';

const router = Router();

const ENDPOINT = 'https://models.github.ai/inference';
const MODEL_NAME = 'openai/gpt-4o-mini';
const RESOURCES_DIR = path.join(__dirname, '../../resources');
const HTML_TEMPLATE_SEPARATOR = '-----';

async function readResource(fileName: string): Promise<string> {
	return fs.readFile(path.join(RESOURCES_DIR, fileName), {
		encoding: 'utf-8',
	});
}

const htmlTemplatePromise = readResource('template.html');
const systemPromptPromise = readResource('system-prompt.txt');
const userPromptPromise = readResource('user-prompt.txt');

function buildTranslationInstructions(language: string | undefined): string {
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

router.post('/simplified', async (req: Request, res: Response) => {
	const {
		t: userInput,
		l: language,
		d: debugStr,
	} = req.body as {
		t?: string;
		l?: string;
		d?: string;
	};

	if (!userInput) {
		res.status(400).type('text').send('Empty content.');
		return;
	}

	try {
		const template = await htmlTemplatePromise;
		const [htmlHeader, htmlFooter] = template.split(
			HTML_TEMPLATE_SEPARATOR,
		);

		res.setHeader('Content-Type', 'text/html;charset=utf-8');
		res.write(htmlHeader);

		const translationInstructions = buildTranslationInstructions(language);
		let systemPrompt = await systemPromptPromise;
		systemPrompt = systemPrompt.replace('{0}', translationInstructions);

		let userPrompt = await userPromptPromise;
		userPrompt = userPrompt.replace('{0}', userInput);

		const client = new OpenAI({
			baseURL: ENDPOINT,
			apiKey: process.env.GITHUB_TOKEN,
		});

		const stream = await client.chat.completions.create({
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			temperature: 1.0,
			max_tokens: 12000,
			model: MODEL_NAME,
			stream: true,
		});

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content ?? '';
			res.write(content);
			if (debugStr === 'true') {
				res.write('\n');
			}
		}

		res.write(htmlFooter);
		res.end();
	} catch (error) {
		console.error(error);
		if (!res.headersSent) {
			res.status(503)
				.type('text')
				.send(
					'Service has failed to process the request. Please try again later.',
				);
		} else {
			res.write(
				'<api-error>Service has failed to process the request. Please try again later.</api-error>',
			);
			res.end();
		}
	}
});

export default router;
