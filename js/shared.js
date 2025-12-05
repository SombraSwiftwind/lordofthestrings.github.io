(function setPageBackground() {
  try {
    const filename = (location.pathname || '').split('/').pop();
    const isIndex = filename === '' || filename === 'index.html' || filename === 'index.htm';
    document.body.classList.add(isIndex ? 'win10-bg' : 'ubuntu-bg');
  } catch (err) {
    console.warn('Failed to set page background class', err);
  }
})();