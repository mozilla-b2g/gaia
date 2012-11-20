var MockTrustedUIManager = {
  open: function(name, frame, origin) {
    this.mOpened = true;
    this.mName = name;
    this.mFrame = frame;
    this.mOrigin = origin;
  },

  close: function() {
    this.mOpened = false;
  },

  mOpened: false,
  mName: null,
  mFrame: null,
  mOrigin: null,
  mTeardown: function teardown() {
    this.mOpened = false;
    this.mName = null;
    this.mFrame = null;
    this.mOrigin = null;
  }
};
