'use strict';

(function(exports) {

  var MockAppChrome = function AppChrome(app) {
    this.ready = Promise.resolve();
  };
  MockAppChrome.prototype.destroy = function() {};
  MockAppChrome.prototype.handleEvent = function(evt) {};
  MockAppChrome.prototype.useLightTheming = function(evt) {};
  MockAppChrome.prototype.handleScrollAreaChanged = function(evt) {};
  MockAppChrome.prototype.reConfig = function(evt) {};
  exports.MockAppChrome = MockAppChrome;
})(window);
