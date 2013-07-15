'use strict';

var MockDialerIndexHtml = (function MockLinkHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/dialer/test/unit/mock_dialer_index.html', false);
  req.send(null);

  return req.responseText;
})();
