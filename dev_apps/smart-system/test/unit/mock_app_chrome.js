'use strict';

(function(exports) {

  var MockAppChrome = function AppChrome(app) {};
  MockAppChrome.prototype.destroy = function() {};
  exports.MockAppChrome = MockAppChrome;
})(window);
