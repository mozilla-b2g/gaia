'use strict';

var MockIccHelper = {
  mProps: {'enabled': true, 'cardState': null, 'iccInfo': {}},

  mEventListeners: {'cardstatechange': [], 'iccinfochange': []},

  mSuiteSetup: function icch_suite_setup() {
    this.mProps = {'enabled': true, 'cardState': null, 'iccInfo': {}};
    this.mEventListeners = {'cardstatechange': [], 'iccinfochange': []};
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
    return this.mProps['enabled'];
  },

  get cardState() {
    return this.mProps['cardState'];
  },

  get iccInfo() {
    return this.mProps['iccInfo'];
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
