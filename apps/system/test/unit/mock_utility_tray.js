var MockUtilityTray = {
  init: function() {
  },

  show: function() {
    this.mShown = true;
  },

  hide: function() {
    this.mShown = false;
  },

  mShown: false,
  mTeardown: function teardown() {
    this.mShown = false;
  }
};
