'use strict';

(function(window) {
  window.System = {
    _start: new Date().getTime() / 1000,

    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    slowTransition: true
  };
}(this));
