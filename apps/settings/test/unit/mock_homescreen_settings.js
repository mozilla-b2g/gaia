'use strict';

define(function() {
  var MockHomescreenSettings = {
    addEventListener: function(key, callback) {
      if (!this._eventHandlers) {
        this._eventHandlers = {};
      }
      this._eventHandlers[key] = callback;
    },
    put: () => {
    },
    get: () => {
      return Promise.resolve('3');
    },
    setStoreName: () => {}
  };

  return MockHomescreenSettings;
});
