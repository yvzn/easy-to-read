(function () {
	const simplifyButton = document.getElementById('simplify-btn');

	if (simplifyButton) {
		healthCheck();
	}

	function healthCheck() {
		const startTime = performance.now();
		fetchWithTimeout('{{environment.healthCheckUrl}}')
			.then(function () {
				sendMonitoringData(performance.now() - startTime);
			})
			.catch(e => {
				// if it's a timeout, send the monitoring data with the error
				const errorString = String(e);
				if (errorString.includes(fetchWithTimeout.name)) {
					sendMonitoringData(performance.now() - startTime, errorString);
				}
				console.error(e)
			});
	}

	function sendMonitoringData(duration, error = '') {
		const resource = '{{environment.monitoringUrl}}';
		const options = {
			method: 'POST',
			body: new URLSearchParams({ d: Math.round(duration), e: error }),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			timeout: 60_000
		};
		fetchWithTimeout(resource, options).catch(console.error);
	}
})();
