var MockEverythingMeHtml = (function MockEverythingMeHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/test/unit/mock_everything.me.html', false);
  req.send(null);

  return req.responseText;
})();
