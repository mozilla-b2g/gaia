'use strict';

window.MockAppsMgmt = {
  getAll: function mam_getAll() {
    var self = this;

    return {
      set onsuccess(cb) {
        this.result = self.mApps;
        cb({target: this});
        if (self.mNext) {
          self.mNext();
        }
      }
    };
  },

  applyDownload: function mam_applyDownload(app) {
    this.mLastAppApplied = app;
  },

  mApps: [],
  mLastAppApplied: null,
  mNext: null,
  mTeardown: function mam_mTeardown() {
    this.mLastAppApplied = null;
    this.mApps = [];
    this.mNext = null;
  },

  mTriggerOninstall: function mam_mTriggerOninstall(app) {
    var evt;
    if (this.oninstall) {
      evt = {
        application: app
      };
      this.oninstall(evt);
    }

    evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationinstall',
      true, false,
      { application: app });
    window.dispatchEvent(evt);
  },

  mTriggerOnuninstall: function mam_mTriggerOnuninstall(app) {
    var evt;
    if (this.onuninstall) {
      evt = {
        application: app
      };
      this.onuninstall(evt);
    }

    evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationuninstall',
      true, false,
      { application: app });
    window.dispatchEvent(evt);
  },

  setSelf: function mam_setSelf(app) {
    this._app = app;
  },

  getSelf: function mam_getSelf() {
    var request = {};

    var self = this;
    setTimeout((function nextTick() {
      if (request.onerror && !self._app) {
        request.onerror({
          'cause': 'No mock app set'
        });
      }
      else if (request.onsuccess && self._app) {
        request.onsuccess({
          target: {
            result: self._app
          }
        });
      }
    }).bind(this));

    return request;
  }
};
