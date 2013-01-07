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
  mute: function() {
    this.mMuteOn = true;
  },
  unmute: function() {
    this.mMuteOn = false;
  },
  turnSpeakerOff: function() {
    this.speakerOn = false;
  },
  turnSpeakerOn: function() {
    this.speakerOn = true;
  },

  mEnableKeypadCalled: false,
  mSyncSpeakerCalled: false,
  mSetCallerContactImageCalled: false,
  mMuteOn: false,
  mSpeakerOn: false,
  mTearDown: function tearDown() {
    this.mEnableKeypadCalled = false;
    this.mSyncSpeakerCalled = false;
    this.mMuteOn = false;
    this.mSpeakerOn = false;
  }
};


