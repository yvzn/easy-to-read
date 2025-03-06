(function () {
	/* Guards *********************************************************************/
	if (!document.getElementById('simplify-form'))
		return;

	if (!typeof HTMLDialogElement === 'function')
		document.getElementById('feedback-dialog').style.display = 'none';

	/* Text simplifier form ********************************************************/

	const { form, originalText, errorMessage, simplifiedVersion, progressBar, userFeedback } = createPageObjects();

	form.element.addEventListener('submit', submitTextForSimplification);
	form.element.t.addEventListener('input', updateCharCounter);
	originalText.editLink.addEventListener('click', () => history.back());
	errorMessage.retryButton.addEventListener('click', () => history.back());
	addEventListener('popstate', showForm);

	function createPageObjects() {
		return {
			form: {
				container: document.getElementById('simplify-form'),
				element: document.getElementById('simplify-form').querySelector('form'),
				charCounter: document.getElementById('char-counter')
			}, originalText: {
				container: document.getElementById('original-text'),
				element: document.getElementById('original-text').querySelector('.formatted-output'),
				editLink: document.getElementById('original-text').querySelector('.edit-link'),
			}, errorMessage: {
				container: document.getElementById('error-message'),
				retryButton: document.getElementById('error-message').querySelector('.retry-btn'),
			}, simplifiedVersion: {
				container: document.getElementById('simplified-version'),
				element: document.getElementById('simplified-version').querySelector('.formatted-output'),
			}, progressBar: {
				container: document.getElementById('progress-bar'),
				element: document.getElementById('progress-bar').querySelector('progress'),
			}, userFeedback: {
				container: document.getElementById('user-feedback'),
			}
		};
	}

	const simplificationResult = {
		rawOutput: '',
		requestId: -1,
		complete: false,
	}

	function submitTextForSimplification(e) {
		e.preventDefault();
		simplificationResult.rawOutput = '';
		simplificationResult.requestId = crypto.randomUUID();
		simplificationResult.complete = false;

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

	const textDecoder = new TextDecoder('utf-8');

	function handleResponseStream(response) {
		if (!response.ok) {
			return handleResponseError(response.statusText);
		}

		const reader = response.body.getReader();
		const isScreenReaderActive = form.element.sr.checked === true;

		reader.read().then(function processText({ done, value }) {
			if (done) {
				simplificationResult.complete = true;
				if (isScreenReaderActive) updateSimplifiedVersion();
				updateProgressBar();
				showFeedbackOpeningButtons();
				showOriginalText();
				sendMonitoringData();
				return;
			}

			let text = textDecoder.decode(value);
			simplificationResult.rawOutput = simplificationResult.rawOutput + text;

			if (simplificationResult.rawOutput.includes('version-2') && !isScreenReaderActive) {
				updateSimplifiedVersion();
			}

			updateProgressBar();
			requestAnimationFrame(() => reader.read().then(processText));
		});
	}

	function handleResponseError(error) {
		console.error(error);

		errorMessage.container.style.display = 'block';
		simplifiedVersion.container.style.display = 'none';
		originalText.container.style.display = 'none';

		history.pushState({}, undefined, '#error');
	}

	function sendMonitoringData() {
		const resource = '{{environment.interactionUrl}}';
		const options = {
			method: 'POST',
			body: new URLSearchParams({
				t: JSON.stringify(form.element.t.value),
				o: JSON.stringify(extractMainContent(simplificationResult.rawOutput)),
				i: simplificationResult.requestId,
			}),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		};

		fetchWithTimeout(resource, options).catch(console.error);
	}

	function extractMainContent(text) {
		let mainTagStart = text.indexOf('<main>');
		let mainTagEnd = text.indexOf('</main>', mainTagStart);
		if (mainTagStart < 0 || mainTagEnd < 0) return text;
		return text.substring(mainTagStart + '<main>'.length, mainTagEnd);
	}

	function updateSimplifiedVersion() {
		const startTag = '<version-2>';
		const startTagPosition = simplificationResult.rawOutput.indexOf(startTag);
		if (startTagPosition < 0) return;

		const endTag = '</version-2>';
		let endTagPosition = simplificationResult.rawOutput.indexOf(endTag);
		if (endTagPosition < 0) endTagPosition = simplificationResult.rawOutput.indexOf('</main>');
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
		formatted = formatted.replace(/\n[ \t]+/g, '\n');
		formatted = formatted.trim();
		return formatted;
	}

	function updateProgressBar() {
		if (simplificationResult.complete) {
			progressBar.container.style.visibility = 'hidden';
			return progressBar.element.value = 100;
		}

		if (simplificationResult.rawOutput.includes('/version-2')) {
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

		errorMessage.container.style.display = 'none';

		history.pushState({}, undefined, '#simplified');
	}

	function showOriginalText() {
		const userInput = form.element.t.value;
		originalText.container.style.display = 'block';
		originalText.element.textContent = userInput;
	}

	function showForm() {
		form.container.style.display = 'block';
		form.container.scrollIntoView();

		simplifiedVersion.container.style.display = 'none';

		originalText.container.style.display = 'none';

		errorMessage.container.style.display = 'none';

		userFeedback.container.style.display = 'none';
	}

	function updateCharCounter() {
		const currentCharacterCount = form.element.t.value.length;
		const initialTextContent = form.charCounter.textContent;
		const pos = initialTextContent.indexOf('/');
		const updatedTextContent = `${currentCharacterCount}\u2008${initialTextContent.slice(pos)}`;
		form.charCounter.textContent = updatedTextContent;
		if (currentCharacterCount < 8000) {
			form.charCounter.classList.remove('max');
		} else {
			form.charCounter.classList.add('max');
		}
	}

	/* Feedback dialog ********************************************************/

	const feedbackDialog = {
		container: document.getElementById('feedback-dialog'),
		title: document.getElementById('feedback-dialog').querySelector('h3'),
		openingButtons: document.querySelectorAll('.feedback-btn'),
		form: document.getElementById('feedback-form'),
		questions: document.getElementById('feedback-dialog').querySelectorAll('.feedback-question'),
		closeButton: document.getElementById('feedback-close-btn'),
		sendButton: document.getElementById('feedback-send-btn'),
		retryButton: document.getElementById('feedback-retry-btn'),
	};

	const feedbackStatus = {
		default: document.getElementById('feedback-dialog').querySelector('.feedback-status p:nth-child(1)'),
		error: document.getElementById('feedback-dialog').querySelector('.feedback-status p:nth-child(2)'),
		success: document.getElementById('feedback-dialog').querySelector('.feedback-status p:nth-child(3)'),
	}

	function showFeedbackOpeningButtons() {
		if ('showModal' in feedbackDialog.container) {
			userFeedback.container.style.display = 'block';
		}
	}

	feedbackDialog.openingButtons.forEach(button => button.addEventListener('click', showFeedbackDialog));
	feedbackDialog.closeButton.addEventListener('click', hideFeedbackDialog);

	function showFeedbackDialog(e) {
		feedbackDialog.form.s.value = e.currentTarget.dataset.feedbackScore;
		feedbackDialog.form.i.value = simplificationResult.requestId;
		feedbackDialog.form.c.value = '';
		showFeedbackStatus('default');
		feedbackDialog.questions.forEach(question => question.style.display = 'block');
		feedbackDialog.sendButton.style.display = 'inline-block';
		feedbackDialog.retryButton.style.display = 'none';
		feedbackDialog.container.showModal();
		feedbackDialog.title.focus();
	}

	function showFeedbackStatus(status) {
		for (const key in feedbackStatus) {
			if (key === status) continue;
			feedbackStatus[key].style.display = 'none';
		}

		if (status === undefined) return;

		feedbackStatus[status].style.display = 'block';
	}

	function hideFeedbackDialog() {
		feedbackDialog.container.close('dismissed');
	}

	feedbackDialog.form.addEventListener('submit', submitFeedback);

	function submitFeedback(e) {
		e.preventDefault();
		const resource = '{{environment.feedbackUrl}}';
		const options = {
			method: 'POST',
			body: new URLSearchParams(new FormData(feedbackDialog.form)),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		};

		showFeedbackStatus(undefined);
		fetchWithTimeout(resource, options)
			.then(handleFeedbackResponse, handleFeedbackError);
	}

	function handleFeedbackResponse(response) {
		if (!response.ok) {
			return handleFeedbackResponse(response.statusText);
		}

		showFeedbackStatus('success');
		feedbackDialog.questions.forEach(question => question.style.display = 'none');
		feedbackDialog.sendButton.style.display = 'none';
		feedbackDialog.retryButton.style.display = 'none';
	}

	function handleFeedbackError(error) {
		console.error(error);

		showFeedbackStatus('error');
		feedbackDialog.sendButton.style.display = 'none';
		feedbackDialog.retryButton.style.display = 'inline-block';
	}
})();
