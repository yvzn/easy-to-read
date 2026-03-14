// @ts-check
import { execFileSync } from 'child_process';
import { mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildCss() {
	const input = join(__dirname, 'styles', 'main.css');
	const output = join(__dirname, 'public', 'css', 'main.css');
	mkdirSync(dirname(output), { recursive: true });

	const postcss = join(__dirname, 'node_modules', '.bin', 'postcss');
	execFileSync(postcss, [input, '--output', output], { stdio: 'inherit' });
	console.log('CSS built:', output);
}

function copyAssets() {
	const src = join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
	const dest = join(__dirname, 'public', 'js', 'chart.umd.js');
	mkdirSync(dirname(dest), { recursive: true });
	copyFileSync(src, dest);
	console.log('Assets copied:', dest);
}

buildCss();
copyAssets();
