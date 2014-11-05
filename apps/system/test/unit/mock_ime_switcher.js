'use strict';

(function(exports) {
  var MockIMESwitcher = function() {
    return this;
  };

  MockIMESwitcher.prototype = {
    start: function mis_start() {
    },

    stop: function mis_stop() {
    },

    show: function mis_show() {
    },

    hide: function mis_hide() {
    },

    handleEvent: function mis_handleEvent() {
    }
  };

  exports.MockIMESwitcher = MockIMESwitcher;
}(window));
