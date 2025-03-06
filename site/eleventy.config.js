import GetGoogleFonts from 'get-google-fonts';
import Image from '@11ty/eleventy-img';
import { readFile } from 'fs/promises';

export default async function (eleventyConfig) {
	eleventyConfig.addWatchTarget('./css/')
	eleventyConfig.addWatchTarget('./js/')
	eleventyConfig.addPassthroughCopy('./img/')
	eleventyConfig.addWatchTarget('./img/')
	eleventyConfig.addPassthroughCopy('.htaccess.sample')

	await eleventyConfig.addPlugin(setDevServerOptions);
	await eleventyConfig.addPlugin(getGoogleFonts);

	eleventyConfig.addFilter("bust", (url) => {
		const [urlPart, paramPart] = url.split("?");
		const params = new URLSearchParams(paramPart || "");
		params.set("v", Date.now());
		return `${urlPart}?${params}`;
	});

	// https://github.com/11ty/eleventy/discussions/2382
	eleventyConfig.addShortcode('svgIcon', async (src) => {
		let metadata = await Image(src, {
			formats: ['svg'],
			dryRun: true,
		});
		return metadata.svg[0].buffer.toString()
	})
}

async function setDevServerOptions(eleventyConfig) {
	const options = { liveReload: false };
	const htaccess = await readFile('.htaccess.sample', 'utf8');

	const headers = htaccess.split('\n').reduce((acc, line) => {
		const match = line.match(/Header set (\S+) "(.+?)"/);
		if (match) {
			const [, name, value] = match;
			acc[name] = value;
		}
		return acc;
	}, {});

	console.log('default headers: ', headers);

	eleventyConfig.setServerOptions({
		...options,
		headers: headers,
	})
}

async function getGoogleFonts(eleventyConfig) {
	try {
		const ggf = new GetGoogleFonts()
		await ggf.download('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',
			{
				path: './fonts/',
				overwriting: true,
				verbose: true,
			});
	}
	catch (e) {
		console.warn(e);
	}

	eleventyConfig.addPassthroughCopy('./fonts/');
}
