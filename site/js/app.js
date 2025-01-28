(function () {
	const form = {
		container: document.getElementById('simplify-form'),
		element: document.getElementById('simplify-form').querySelector('form')
	};

	const simplifiedVersion = {
		container: document.getElementById('simplified-version'),
		element: document.getElementById('simplified-version').querySelector('.formatted-output'),
	};

	const progressBar = {
		container: document.getElementById('progress-bar'),
		element: document.getElementById('progress-bar').querySelector('progress'),
	}

	const originalText = {
		container: document.getElementById('original-text'),
		element: document.getElementById('original-text').querySelector('.formatted-output'),
		editLink: document.getElementById('original-text').querySelector('.edit-link'),
	};

	const textDecoder = new TextDecoder('utf-8');
	const simplificationResult = {
		rawOutput: '',
		requestId: -1,
	}

	form.element.addEventListener('submit', submitTextForSimplification);
	originalText.editLink.addEventListener('click', () => history.back());
	addEventListener('popstate', showForm);

	function submitTextForSimplification(e) {
		e.preventDefault();
		simplificationResult.rawOutput = '';
		simplificationResult.requestId = crypto.randomUUID();

		showOriginalText();
		showSimplifiedVersion();

		const resource = form.element.action;
		const options = {
			method: form.element.method,
			body: new URLSearchParams(new FormData(form.element)),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		};

		fetchWithTimeout(resource, options)
			.then(handleResponseStream, handleResponseError);
	}

	function handleResponseStream(response) {
		const reader = response.body.getReader();

		reader.read().then(function processText({ done, value }) {
			if (done) {
				sendMonitoringData();
				return;
			}

			let text = textDecoder.decode(value);
			simplificationResult.rawOutput = simplificationResult.rawOutput + text;

			if (simplificationResult.rawOutput.includes('version-2')) {
				updateSimplifiedVersion();
			}

			updateProgressBar();
			requestAnimationFrame(() => reader.read().then(processText));
		});
	}

	function handleResponseError(error) {
		// TODO
		console.error(error);
	}

	function sendMonitoringData() {
		// TODO
		console.log(JSON.stringify(simplificationResult.rawOutput));
	}

	function updateSimplifiedVersion() {
		const startTag = '<version-2>';
		const startTagPosition = simplificationResult.rawOutput.indexOf(startTag);
		if (startTagPosition < 0) return;

		const endTag = '</version-2>';
		let endTagPosition = simplificationResult.rawOutput.indexOf(endTag);
		if (endTagPosition < 0) endTagPosition = undefined;

		let simplifiedVersionText = simplificationResult.rawOutput.substring(startTagPosition + startTag.length, endTagPosition);
		simplifiedVersionText = format(simplifiedVersionText);

		simplifiedVersion.element.textContent = simplifiedVersionText;
	}

	function format(text) {
		let formatted = text;
		formatted = formatted.replaceAll('\r', '');
		formatted = formatted.replace(/[ \t]+\n/g, '\n');
		formatted = formatted.replace(/\n[ \t]+/g, '\n');
		formatted = formatted.replace(/\.([^\n"])/g, (_match, p1) => `.\n${p1}`)
		formatted = formatted.replace(/(#+)(.*)/g, (_, p1, p2) => `<h${p1.length+3}>${p2.trim()}</h${p1.length+3}>`);
		formatted = formatted.trim();
		return formatted;
	}

	function updateProgressBar() {
		if (simplificationResult.rawOutput.includes('/version-2')) {
			progressBar.container.style.visibility = 'hidden';
			return progressBar.element.value = 90;
		}

		if (simplificationResult.rawOutput.includes('/observation-2')) {
			return progressBar.element.value = 80;
		}

		if (simplificationResult.rawOutput.includes('/version-1')) {
			return progressBar.element.value = 60;
		}

		if (simplificationResult.rawOutput.includes('/observation-1')) {
			return progressBar.element.value = 40;
		}

		if (simplificationResult.rawOutput) {
			return progressBar.element.value = 20;
		}
	}

	function showSimplifiedVersion() {
		form.container.style.display = 'none';

		simplifiedVersion.container.style.display = 'block';
		simplifiedVersion.element.textContent = '';
		
		progressBar.container.style.visibility = 'visible';
		progressBar.element.value = 10;

		const userInput = form.element.t.value;
		originalText.container.style.display = 'block';
		originalText.element.textContent = userInput;

		history.pushState({}, undefined, '#simplified');
	}

	function showOriginalText() {
	}

	function showForm() {
		form.container.style.display = 'block';
		form.container.scrollIntoView();

		simplifiedVersion.container.style.display = 'none';

		originalText.container.style.display = 'none';
	}
})();
