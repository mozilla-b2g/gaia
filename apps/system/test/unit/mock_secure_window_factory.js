'use strict';

(function(exports) {

  var MockSecureWindowFactory = function SecureWindowFactory() {};
  MockSecureWindowFactory.prototype.handleEvent = function() {};
  MockSecureWindowFactory.prototype.create = function() {};
  exports.MockSecureWindowFactory = MockSecureWindowFactory;
})(window);
