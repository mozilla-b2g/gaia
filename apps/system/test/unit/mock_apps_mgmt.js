'use strict';

var MockAppsMgmt = {
  getAll: function mam_getAll() {
    var callOnSuccess = (function callOnSuccess() {
      var evt = {
        target: {
          result: this.mApps
        }
      };
      request.onsuccess(evt);

      if (this.mNext) {
        this.mNext();
      }
    }).bind(this);

    function nextTick() {
      if (request.onsuccess) {
        callOnSuccess();
      }
    };

    var request;
    if (this.mAsync) {
      request = {};
    } else {
      request = {
        get onsuccess() {
          return this._onsuccess;
        },
        set onsuccess(func) {
          this._onsuccess = func;
          callOnSuccess();
        }
      };

    }
      
    if (this.mAsync) {
      setTimeout(nextTick);
    }

    return request;
  },

  applyDownload: function mam_applyDownload(app) {
    this.mLastAppApplied = app;
  },

  mApps: [],
  mLastAppApplied: null,
  mNext: null,
  mAsync: false,

  mTeardown: function mam_mTeardown() {
    this.mLastAppApplied = null;
    this.mApps = [];
    this.mNext = null;
    this.mAsync = false;
  },

  mTriggerOninstall: function mam_mTriggerOninstall(app) {
    if (this.oninstall) {
      var evt = {
        application: app
      };
      this.oninstall(evt);
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationinstall',
      true, false,
      { application: app });
    window.dispatchEvent(evt);
  },

  mTriggerOnuninstall: function mam_mTriggerOnuninstall(app) {
    if (this.onuninstall) {
      var evt = {
        application: app
      };
      this.onuninstall(evt);
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationuninstall',
      true, false,
      { application: app });
    window.dispatchEvent(evt);
  }
};
