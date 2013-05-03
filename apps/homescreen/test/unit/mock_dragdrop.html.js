var MockDragDropHtml = (function MockDragDropHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/test/unit/mock_dragdrop.html', false);
  req.send(null);

  return req.responseText;
})();
