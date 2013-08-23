var MockCallScreen = {
  insertCall: function() {},
  enableKeypad: function() {
    this.mEnableKeypadCalled = true;
  },
  disableKeypad: function() {
    this.mEnableKeypadCalled = false;
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
    this.mSpeakerOn = false;
  },
  turnSpeakerOn: function() {
    this.mSpeakerOn = true;
  },
  render: function(mode) {
    this.mLastRenderMode = mode;
  },
  showIncoming: function() {
    this.mShowIncomingCalled = true;
  },
  hideIncoming: function() {
    this.mHideIncomingCalled = true;
  },

  set callsCount(count) {
    this.mCallsCount = count;
  },
  mCallsCount: null,

  // Fake dom
  calls: document.createElement('div'),
  screen: document.createElement('div'),
  incomingContainer: document.createElement('div'),
  incomingNumber: document.createElement('div'),

  mEnableKeypadCalled: false,
  mSyncSpeakerCalled: false,
  mSetCallerContactImageCalled: false,
  mMuteOn: false,
  mSpeakerOn: false,
  mLastRenderMode: null,
  mTeardown: function teardown() {
    this.mEnableKeypadCalled = false;
    this.mSyncSpeakerCalled = false;
    this.mMuteOn = false;
    this.mSpeakerOn = false;
    this.mLastRenderMode = null;
    this.mShowIncomingCalled = false;
    this.mHideIncomingCalled = false;
    this.calls = document.createElement('div');
    this.screen = document.createElement('div');
    this.incomingContainer = document.createElement('div');
    this.incomingNumber = document.createElement('div');
    this.mCallsCount = null;
  }
};


