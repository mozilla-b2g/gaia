var MockPageHtml = (function getMockPageHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/test/unit/mock_page.html', false);
  req.send(null);

  return req.responseText;
})();

