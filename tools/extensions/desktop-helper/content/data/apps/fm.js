!function() {

  if (!(/fm.gaiamobile.org/.test(location.href))) { return }

  // FM radio has a hidden body attribute for some reason?
  // Remove it so we can at least use the UI
  // TODO: Figure out why this is needed
  setTimeout(function() {
    window.document.body.removeAttribute('hidden');
  }, 500);
}();
