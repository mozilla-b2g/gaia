'use strict';
/* exported MockNavigatormozApps */

var MockNavigatormozApps = {
  mApps: [],
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
      return request.onsuccess(evt);
    }
  },

  mTriggerOninstall: function mam_mTriggerOninstall(app) {
    if (this.mgmt.oninstall) {
      var evt = { application: app };
      this.mgmt.oninstall(evt);
    }
  },

  mgmt: {
    getAll: function() {
      return {
        result: MockNavigatormozApps.mApps,
        set onsuccess(cb) {
          cb({target: this});
        }
      };
    },
    uninstall: function() {},
    addEventListener: function() {

    }
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

