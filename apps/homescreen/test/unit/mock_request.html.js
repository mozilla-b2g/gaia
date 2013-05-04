var MockRequestHtml = (function MockRequestHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/test/unit/mock_request.html', false);
  req.send(null);

  return req.responseText;
})();
