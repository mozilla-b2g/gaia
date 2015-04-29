'use strict';

var fb = window.fb || {};
window.fb = fb;

// Only will be executed in the case of not loading fb.utils previously
// i.e. dialer and call log FB integration
fb.utils = window.fb.utils || {};
window.fb.utils = fb.utils;

if (typeof fb.utils.Request !== 'function') {
/**
  *   Request auxiliary object to support asynchronous calls
  *
  */
  fb.utils.Request = function() {
    this.done = function(result) {
      this.result = result;
      if (typeof this.onsuccess === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onsuccess(ev);
        }.bind(this), 0);
      }
    };

    this.failed = function(error) {
      this.error = error;
      if (typeof this.onerror === 'function') {
        var ev = {};
        ev.target = this;
        window.setTimeout(function() {
          this.onerror(ev);
        }.bind(this), 0);
      }
    };
  };
}
