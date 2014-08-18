'use strict';

(function(exports) {
  var MockCustomEvent = function(type, eventInitDict) {
    this.type = type;
    if (typeof eventInitDict === 'object') {
      this.bubbles = eventInitDict.bubbles;
      this.cancelable = eventInitDict.cancelable;
      this.detail = eventInitDict.detail;
    }

    return this;
  };

  MockCustomEvent.prototype = {
    initCustomEvent:
      function mce_initCustomEvent(type, canBubble, cancelable, detail) {
      this.type = type;
      this.bubbles = canBubble;
      this.cancelable = cancelable;
      this.detail = detail;
    }
  };

  exports.MockCustomEvent = MockCustomEvent;
}(window));
