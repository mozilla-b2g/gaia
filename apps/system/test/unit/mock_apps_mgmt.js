var MockAppsMgmt = {
  getAll: function mam_getAll() {
    var request = {};

    setTimeout((function nextTick() {
      if (request.onsuccess) {
        var evt = {
          target: {
            result: this.mApps
          }
        };
        request.onsuccess(evt);
        if (this.mNext) {
          this.mNext();
        }
      }
    }).bind(this));

    return request;
  },

  applyDownload: function mam_applyDownload(app) {
    this.mLastAppApplied = app;
  },

  mApps: [],
  mLastApp: null,
  mLastAppApplied: null,
  mNext: null,
  mTeardown: function mam_mTeardown() {
    this.mLastAppApplied = null;
    this.mApps = [];
    this.mLastApp = null;
    this.mNext = null;
  },
  mTriggerOninstall: function mam_mTriggerOninstall() {
    if (this.oninstall) {
      var evt = {
        application: this.mLastApp
      };
      this.oninstall(evt);
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationinstall',
      true, false,
      { application: this.mLastApp });
    window.dispatchEvent(evt);
  },
  mTriggerOnuninstall: function mam_mTriggerOnuninstall() {
    if (this.onuninstall) {
      var evt = {
        application: this.mLastApp
      };
      this.onuninstall(evt);
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('applicationuninstall',
      true, false,
      { application: this.mLastApp });
    window.dispatchEvent(evt);
  }
};
