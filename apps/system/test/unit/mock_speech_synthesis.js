'use strict';

(function(exports) {

  var listeners = {};

  var MockSpeechSynthesisUtterance = function() {
    this.addEventListener = function(name, callback) {
      listeners[name] = callback;
    };
  };

  var MockSpeechSynthesis = {
    cancel: function() {},
    speak: function() {
      if (listeners.start) {
        listeners.start();
      }
      if (listeners.end) {
        listeners.end();
      }
    },
    getVoices: function() {
      return [{ lang: 'en-US' }];
    }
  };

  exports.MockSpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  exports.MockSpeechSynthesis = MockSpeechSynthesis;
}(window));
