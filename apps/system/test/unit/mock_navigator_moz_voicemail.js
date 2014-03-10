'use strict';

var MockNavigatorMozVoicemail = {
  number: '123',
  mActive: false,
  mCallbacks: {},

  setActive: function(bool) {
    this.mActive = bool;
  },

  getStatus: function() {
    return {
      hasMessages: this.mActive
    };
  },

  addEventListener: function(name, callback) {
    this.mCallbacks[name] = callback;
    return;
  },

  triggerEvent: function(name) {
    this.mCallbacks[name].handleEvent();
  }
};
