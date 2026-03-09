(function () {
  const simplifyButton = document.getElementById('simplify-btn');

  if (simplifyButton) {
    healthCheck();
  }

  function healthCheck(){
    const startTime = performance.now();
    fetchWithTimeout('{{environment.healthCheckUrl}}')
      .then(function () {
        sendMonitoringData(performance.now() - startTime);
      })
      .catch(console.error);
  }

  function sendMonitoringData(duration) {
    const resource = '{{environment.monitoringUrl}}';
    const options = {
      method: 'POST',
      body: new URLSearchParams({ d: Math.round(duration) }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    fetchWithTimeout(resource, options).catch(console.error);
  }
})();
