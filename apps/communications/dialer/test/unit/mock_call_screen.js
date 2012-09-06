var MockCallScreen = {
  enableKeypad: function() {
    this.mEnableKeypadCalled = true;
  },
  syncSpeakerEnabled: function() {
    this.mSyncSpeakerCalled = true;
  },
  setCallerContactImage: function() {
    this.mSetCallerContactImageCalled = true;
  },

  mEnableKeypadCalled: false,
  mSyncSpeakerCalled: false,
  mSetCallerContactImageCalled: false,
  mTearDown: function tearDown() {
    this.mEnableKeypadCalled = false;
    this.mSyncSpeakerCalled = false;
  }
};


