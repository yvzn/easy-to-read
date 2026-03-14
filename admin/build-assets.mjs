// @ts-check
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildCss() {
	const input = join(__dirname, 'styles', 'main.css');
	const output = join(__dirname, 'public', 'css', 'main.css');
	mkdirSync(dirname(output), { recursive: true });

	const css = readFileSync(input, 'utf8');
	const result = await postcss([tailwindcss()]).process(css, { from: input, to: output });

	writeFileSync(output, result.css);
	if (result.map) {
		writeFileSync(output + '.map', result.map.toString());
	}
	console.log('CSS built:', output);
}

function copyAssets() {
	const src = join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
	const dest = join(__dirname, 'public', 'js', 'chart.umd.js');
	mkdirSync(dirname(dest), { recursive: true });
	copyFileSync(src, dest);
	console.log('Assets copied:', dest);
}

buildCss().then(copyAssets).catch((err) => {
	console.error('Build failed:', err);
	process.exit(1);
});
