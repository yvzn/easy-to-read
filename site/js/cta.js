(function () {
  const smallCta = document.getElementById('cta-small');
  const largeCta = document.getElementById('cta-large');
  const simplifyButton = document.getElementById('simplify-btn');

  if (simplifyButton || largeCta) {
    smallCta.style.display = 'none';
  }

  if (largeCta && 'IntersectionObserver' in window) {
    toggleSmallCta();
  }

  function toggleSmallCta() {
    const observer = new IntersectionObserver(
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
