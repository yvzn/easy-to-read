(function () {
  const smallCta = document.getElementById('cta-small');
  const largeCta = document.getElementById('cta-large');

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
