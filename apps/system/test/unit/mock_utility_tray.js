var MockUtilityTray = {
  init: function() {
  },

  show: function() {
    this.shown = true;
    if (this.overlay._transitionEnd) {
      this.overlay._transitionEnd();
    }
  },

  hide: function() {
    this.shown = false;
  },

  updateNotificationCount: function() {
  },

  shown: false,
  _transitionEnd: null,
  overlay: {
    _transitionEnd: null,
    addEventListener: function(eventName, callback) {
      this._transitionEnd = callback;
    }
  },
  mTeardown: function teardown() {
    this.shown = false;
  }
};
