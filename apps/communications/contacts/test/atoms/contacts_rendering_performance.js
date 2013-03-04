'use strict';

(function(window) {
  var firstChunkEvent = 'x-moz-perf-contacts-first-chunk',
      lastChunkEvent = 'x-moz-perf-contacts-last-chunk';
  window.ContactsRenderingPerformance = {
    register: function() {
      window.cStart = window.performance.now();

      window.addEventListener(firstChunkEvent, this.firstChunkHandler);
      window.addEventListener(lastChunkEvent, this.lastChunkHandler);

      marionetteScriptFinished();
    },

    unregister: function() {
      window.removeEventListener(firstChunkEvent, this.firstChunkHandler);
      window.removeEventListener(lastChunkEvent, this.lastChunkHandler);

      marionetteScriptFinished();
    },

    firstChunkHandler: function(evt) {
      window.cFirst = window.performance.now();
    },

    lastChunkHandler: function(evt) {
      window.cLast = window.performance.now();
    },

    waitForResults: function() {
      if (window.cLast) {
        this.finish();
        return;
      }

      var self = this;
      window.addEventListener(lastChunkEvent, function finished(evt) {
        window.removeEventListener(lastChunkEvent, finished);
        self.finish();
      });
    },

    finish: function() {
      marionetteScriptFinished({
        start: window.cStart,
        first: window.cFirst,
        last: window.cLast
      });
    }
  };
})(window.wrappedJSObject);
