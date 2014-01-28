'use strict';

(function(exports) {

  var MockAppChrome = function AppChrome(app) {};
  MockAppChrome.prototype.getBarHeight =
  MockAppChrome.prototype.destroy =
  MockAppChrome.prototype.hidingNavigation =
  function() {};

  exports.MockAppChrome = MockAppChrome;
})(window);
