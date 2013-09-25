'use strict';

var MockDialerOncallHtml = (function MockLinkHtml() {
  var req = new XMLHttpRequest();
  req.open('GET', '/dialer/test/unit/mock_dialer_oncall.html', false);
  req.send(null);

  return req.responseText;
})();
