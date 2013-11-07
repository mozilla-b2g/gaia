'use strict';

var MockIccHelper = {
  mProps: {'cardState': null, 'iccInfo': {}, 'retryCount': 0},

  mEventListeners: {'cardstatechange': [], 'iccinfochange': []},

  mSuiteSetup: function icch_suite_setup() {
    this.mProps = {
      'cardState': null,
      'iccInfo': {},
      'retryCount': 0};
    this.mEventListeners = {'cardstatechange': [], 'iccinfochange': []};
  },

  mSuiteTeardown: function icch_teardown() {},

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

  get cardState() {
    return this.mProps['cardState'];
  },

  get iccInfo() {
    return this.mProps['iccInfo'];
  },

  getCardLockRetryCount: function(lockType, onresult) {
    onresult(this.mProps['retryCount']);
  },

  setProperty: function _setProperty(property, newState) {
    this.mProps[property] = newState;
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
  },

  unlockCardLock: function() {
    var settingsRequest = {
      result: {},
      set onsuccess(callback) {
        callback.call(this);
      },
      set onerror(callback) {}
    };
    return settingsRequest;
  }
};
