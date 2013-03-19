var MockImportHtml = (function MockGoogleListing() {
  var req = new XMLHttpRequest();
  req.open('GET', '/import/test/unit/mock_import.html', false);
  req.send(null);

  return req.responseText;
})();
