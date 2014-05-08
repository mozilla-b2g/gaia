var MockImportNavigationHTML = (function MockImportHTML() {
  var req = new XMLHttpRequest();
  req.open('GET', 'test/unit/mock_navigation_index.html', false);
  req.send(null);

  return req.responseText;
})();
