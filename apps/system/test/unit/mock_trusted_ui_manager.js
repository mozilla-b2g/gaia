'use strict';

var MockTrustedUIManager = {
  open: function(name, frame, chromeEventId) {
    this.mOpened = true;
    this.mName = name;
    this.mFrame = frame;
    this.mChromeEventId = chromeEventId;
  },

  close: function() {
    this.mOpened = false;
  },

  mOpened: false,
  mName: null,
  mFrame: null,
  mChromeEventId: null,
  mTeardown: function teardown() {
    this.mOpened = false;
    this.mName = null;
    this.mFrame = null;
    this.mChromeEventId = null;
  }
};
