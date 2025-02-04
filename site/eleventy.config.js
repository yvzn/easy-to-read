import GetGoogleFonts from 'get-google-fonts';

export default async function (eleventyConfig) {
	eleventyConfig.addWatchTarget('./css/')
	eleventyConfig.addWatchTarget('./js/')
	eleventyConfig.addPassthroughCopy('./img/')
	eleventyConfig.addWatchTarget('./img/')
	eleventyConfig.addPassthroughCopy('.htaccess.sample')

	eleventyConfig.setServerOptions({
		liveReload: false,
	})

	await eleventyConfig.addPlugin(getGoogleFonts);
}

async function getGoogleFonts(eleventyConfig) {
	const ggf = new GetGoogleFonts()
	await ggf.download('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',
		{
			path: './fonts/',
			overwriting: true,
			verbose: true,
		});
	eleventyConfig.addPassthroughCopy('./fonts/');
}
