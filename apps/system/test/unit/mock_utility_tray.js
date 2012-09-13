var MockUtilityTray = {
  show: function() {
    this.mShown = true;
  },

  hide: function() {
    this.mShown = false;
  },

  mShown: false,
  mTearDown: function tearDown() {
    this.mShown = false;
  }
};
