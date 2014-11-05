(function(exports) {
  'use strict';

  var lastInstance;

  var MockXMLHttpRequest = function() {
    lastInstance = this;
  };

  MockXMLHttpRequest.prototype = {
    open: function() {},
    send: function() {}
  };

  MockXMLHttpRequest.triggerReadyStateChange = function(options) {
    if (lastInstance) {
      lastInstance.status = options.status;
      if (lastInstance.onreadystatechange) {
        lastInstance.onreadystatechange();
      }
      if (options.status === 200) {
        lastInstance.response = options.response;
        lastInstance.onload();
      } else {
        lastInstance.statusText = options.statusText;
        lastInstance.onerror();
      }
    }
  };

  exports.MockXMLHttpRequest = MockXMLHttpRequest;
}(window));
