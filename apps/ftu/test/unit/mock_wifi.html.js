'use strict';

(function(exports) {
  var MockImportWifiHTML = (function MockImportHTML() {
    var req = new XMLHttpRequest();
    req.open('GET', 'mock_wifi.html', false);
    req.send(null);

    return req.responseText;
  })();

  exports.MockImportWifiHTML = MockImportWifiHTML;
})(window);
