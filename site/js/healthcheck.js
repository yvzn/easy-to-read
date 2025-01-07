(function () {
  var simplifyButton = document.getElementById('simplify-btn');

  if (simplifyButton) {
    healthCheck();
  }

  function healthCheck(){
    fetch('{{environment.healthCheckUrl}}');
  }
})();
