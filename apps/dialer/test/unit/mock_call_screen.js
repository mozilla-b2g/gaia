var MockCallScreen = {
  enableKeypad: function() {
    this.mEnableKeypadCalled = true;
  },
  syncSpeakerEnabled: function() {
    this.mSyncSpeakerCalled = true;
  },

  mEnableKeypadCalled: false,
  mSyncSpeakerCalled: false,
  mTearDown: function tearDown() {
    this.mEnableKeypadCalled = false;
    this.mSyncSpeakerCalled = false;
  }
};


