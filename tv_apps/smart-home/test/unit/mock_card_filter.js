(function(exports) {
  'use strict';

  var MockCardFilter = function() {
    this.mEventHandlers = {};
  };

  MockCardFilter.prototype = {
    start: function() {},
    stop: function() {},
    on: function(eventName, callback) {
      if (typeof callback === 'function') {
        if (!this.mEventHandlers[eventName]) {
          this.mEventHandlers[eventName] = [];
        }
        this.mEventHandlers[eventName].push(callback);
      }

    },
    off: function(eventName, callback) {
      var handlers = this.mEventHandlers[eventName];
      if (typeof callback === 'function' && handlers) {
        var index = handlers.indexOf(callback);
        handlers.splice(index, 1);
      }
    },
    mFireEvent: function(eventName, detail) {
      var handlers = this.mEventHandlers[eventName];
      if (handlers) {
        handlers.forEach(function(callback) {
          if (typeof callback === 'function') {
            callback(detail);
          }
        });
      }
    }
  };

  exports.MockCardFilter = MockCardFilter;
}(window));
