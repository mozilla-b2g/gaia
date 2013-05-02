var MockSaveBookmarkHtml = (function MockSaveBookmarkHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/test/unit/mock_save_bookmark.html', false);
  req.send(null);

  return req.responseText;
})();
