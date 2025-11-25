async function fetchWithTimeout(resource, options = {}) {
	const { timeout = 10_000 } = options;

	const controller = new AbortController();
	const timeoutID = setTimeout(() => controller.abort(`${fetchWithTimeout.name} aborded after ${timeout}ms`), timeout);

	const response = await fetch(resource, {
		...options,
		signal: controller.signal
	});
	clearTimeout(timeoutID);

	return response;
}
