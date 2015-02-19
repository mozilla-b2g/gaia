'use strict';

(function(exports) {

  var MockAppChrome = function AppChrome(app) {};
  MockAppChrome.prototype.destroy = function() {};
  MockAppChrome.prototype.handleEvent = function(evt) {};
  exports.MockAppChrome = MockAppChrome;
})(window);
