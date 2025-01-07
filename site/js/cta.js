(function () {
  var smallCta = document.getElementById('cta-small');
  var largeCta = document.getElementById('cta-large');
  var simplifyButton = document.getElementById('simplify-btn');

  if (simplifyButton || largeCta) {
    smallCta.style.display = 'none';
  }

  if (largeCta && 'IntersectionObserver' in window) {
    toggleSmallCta();
  }

  function toggleSmallCta() {
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          smallCta.style.display = 'none';
        } else {
          smallCta.style.display = 'inline-block';
        }
      },
      { rootMargin: '-100px' }
    );

    observer.observe(largeCta);
  }
})();
