'use strict';

var MockIccHelper = {
  mProps: {'cardState': null},

  mEventListeners: {'cardstatechange': []},

  mSuiteSetup: function icch_suite_setup() {
    this.mProps = {'cardState': null};
    this.mEventListeners = {'cardstatechange': []};
  },

  mTeardown: function icch_teardown() {},

  mTriggerEventListeners: function icch_triggerEventListeners(type, evt) {
    if (!this.mEventListeners[type]) {
      return;
    }
    this.mEventListeners[type].forEach(function(callback) {
      if (typeof callback === 'function') {
        callback(evt);
      } else if (typeof callback == 'object' &&
                 typeof callback['handleEvent'] === 'function') {
        callback['handleEvent'](evt);
      }
    });

    if (typeof this['on' + type] === 'function') {
      this['on' + type](evt);
    }
  },

  get enabled() {
    return true;
  },

  get cardState() {
    return this.mProps['cardState'];
  },

  addEventListener: function icch_addEventListener(type, callback) {
    if (this.mEventListeners[type]) {
      this.mEventListeners[type][this.mEventListeners[type].length] = callback;
    }
  },

  removeEventListener: function icch_removeEventListener(type, callback) {
    if (this.mEventListeners[type]) {
      var idx = this.mEventListeners[type].indexOf(callback);
      this.mEventListeners[type].splice(idx, 1);
    }
  }
};
