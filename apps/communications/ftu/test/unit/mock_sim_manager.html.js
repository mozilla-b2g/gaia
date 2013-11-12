var MockImportSimManagerHTML = (function MockImportHTML() {
  var req = new XMLHttpRequest();
  req.open('GET', '/ftu/test/unit/mock_sim_manager_index.html', false);
  req.send(null);

  return req.responseText;
})();
