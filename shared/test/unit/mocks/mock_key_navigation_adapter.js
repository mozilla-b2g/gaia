(function(exports) {
  'use strict';

  var handler = {};

  var MockKeyNavigationAdapter = function() {
    this.init = function() {
    };

    this.on = function(evt, fn) {
      if (!handler[evt]) {
        handler[evt] = [];
      }
      handler[evt].push(fn);
    };

    this.mTrigger = function(evt) {
      handler[evt].forEach(function(fn) {
        fn();
      });
    };
  };

  exports.MockKeyNavigationAdapter = MockKeyNavigationAdapter;
}(window));
