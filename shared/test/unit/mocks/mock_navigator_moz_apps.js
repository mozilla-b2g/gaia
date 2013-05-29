'use strict';

var MockNavigatormozApps = {
  getSelf: function mnma_getSelf() {
    var request = {};

    this.mLastRequest = request;
    return request;
  },

  mTriggerLastRequestSuccess: function(result) {
    var request = this.mLastRequest;
    request.result = result || {
      name: 'sms',
      launch: this._mLaunch.bind(this)
    };

    if (request.onsuccess) {
      var evt = {
        target: request
      };
      request.onsuccess(evt);
    }
  },

  mLastRequest: null,

  _mLaunch: function mnma_launch() {
    this.mAppWasLaunched = true;
  },

  mTeardown: function mnma_mTeardown() {
    this.mAppWasLaunched = false;
    this.mLastRequest = null;
  }
};

