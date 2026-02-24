import {
	constructURL,
	merge,
	isValidURL,
	parse,
	download,
} from "google-fonts-helper";
import Image from '@11ty/eleventy-img';
import { readFile } from 'fs/promises';

export default async function (eleventyConfig) {
	eleventyConfig.addWatchTarget('./css/');
	eleventyConfig.addWatchTarget('./js/');
	eleventyConfig.addPassthroughCopy('./img/');
	eleventyConfig.addWatchTarget('./img/');
	eleventyConfig.addPassthroughCopy('./.htaccess.sample');
	eleventyConfig.addPassthroughCopy('./robots.txt');

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
		const downloader = download('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&display=swap', {
			base64: false,
			overwriting: true,
			outputDir: './fonts',
			stylePath: 'fonts.css',
			fontsDir: '',
			fontsPath: './fonts'
		});

		await downloader.execute();
	}
	catch (e) {
		console.warn(e);
	}

	eleventyConfig.addPassthroughCopy('./fonts/');
}
