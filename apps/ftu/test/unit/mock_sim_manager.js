'use strict';

var MockSimManager = {

  addUnlockSuccessCallback: function(callback) {
    this.unlockSuccessCallback = callback;
  },
  publish: function(eventName) {
    if (eventName === 'iccUnlockSuccess') {
      this.unlockSuccessCallback();
    }
  },
  handleCardState: function() {},
  checkSIMButton: function() {},
  available: function() {},
  init: function() {}
};
