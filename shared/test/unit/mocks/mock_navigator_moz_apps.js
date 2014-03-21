'use strict';
/* exported MockNavigatormozApps */

var MockNavigatormozApps = {
  getSelf: function mnma_getSelf() {
    var request = {};

    this.mLastRequest = request;
    return request;
  },

  mTriggerLastRequestSuccess: function(result) {
    var request = this.mLastRequest;
    var self = this;
    request.result = result || {
      name: 'sms',
      launch: this._mLaunch.bind(this),
      connect: function(keyword) {
        self.mLastConnectionKeyword = keyword;
        return {
          then: function(cb) {
            self.mLastConnectionCallback = cb;
          }
        };
      }
    };

    if (request.onsuccess) {
      var evt = {
        target: request
      };
      request.onsuccess(evt);
    }
  },

  mgmt: {
    getAll: function() {
      return {};
    },
    uninstall: function() {}
  },

  mLastRequest: null,

  _mLaunch: function mnma_launch(entryPoint) {
    this.mAppWasLaunched = true;
    this.mAppWasLaunchedWithEntryPoint = entryPoint;
  },

  mTeardown: function mnma_mTeardown() {
    this.mAppWasLaunched = false;
    this.mAppWasLaunchedWithEntryPoint = null;
    this.mLastRequest = null;
  }
};

