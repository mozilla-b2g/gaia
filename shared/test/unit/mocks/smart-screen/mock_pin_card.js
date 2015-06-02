(function(exports) {
  'use strict';

  function MockPinCard() {
    var handler = {};
    this.pinnedChannels = {};
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
  }

  exports.MockPinCard = MockPinCard;
}(window));
