export default function (eleventyConfig) {
	eleventyConfig.addWatchTarget('./css/')
	eleventyConfig.addWatchTarget('./js/')
	eleventyConfig.addPassthroughCopy('./img/')
	eleventyConfig.addWatchTarget('./img/')
	eleventyConfig.addPassthroughCopy('.htaccess.sample')

	eleventyConfig.setServerOptions({
		liveReload: false,
	})
}
