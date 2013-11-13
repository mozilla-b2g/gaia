'use strict';

(function(window) {
  var DEBUG = true;
  window.System = {
    _start: new Date().getTime() / 1000,

    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    slowTransition: false,

    publish: function sys_publish(eventName, detail) {
      var evt = new CustomeEvent(eventName, { detail: detail });
      window.dispatchEvent(evt);
    },

    debug: function vm_debug() {
      if (DEBUG) {
        console.log('[System]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    }
  };
}(this));
