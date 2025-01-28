(function () {
  const simplifyButton = document.getElementById('simplify-btn');

  if (simplifyButton) {
    healthCheck();
  }

  function healthCheck(){
    fetchWithTimeout('{{environment.healthCheckUrl}}');
  }
})();
