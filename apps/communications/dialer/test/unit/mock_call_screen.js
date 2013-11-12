var MockCallScreen = {
  insertCall: function() {},
  moveToGroup: function() {},
  toggle: function(cb) {
    if (typeof(cb) == 'function') {
      cb();
    }
  },
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
  setDefaultContactImage: function() {
    this.mSetDefaultContactImageCalled = true;
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
  showStatusMessage: function(text) {
    this.mShowStatusMessageCalled = true;
  },
  showGroupDetails: function() {
    this.mGroupDetailsShown = true;
  },
  hideGroupDetails: function() {
    this.mGroupDetailsShown = false;
  },

  createTicker: function(node) {
    this.mCalledCreateTicker = true;
  },

  stopTicker: function(node) {
    this.mCalledStopTicker = true;
  },

  set singleLine(value) {
    this.mSingleLine = value;
  },
  mSingleLine: null,

  set holdAndAnswerOnly(enabled) {
    this.mHoldAndAnswerOnly = enabled;
  },
  mHoldAndAnswerOnly: false,

  set cdmaCallWaiting(enabled) {
    this.mCdmaCallWaiting = enabled;
  },
  mCdmaCallWaiting: false,

  get inStatusBarMode() {
    return this.mInStatusBarMode;
  },
  mInStatusBarMode: false,

  // Fake dom
  calls: document.createElement('div'),
  screen: document.createElement('div'),
  incomingContainer: document.createElement('div'),
  incomingNumber: document.createElement('div'),

  mEnableKeypadCalled: false,
  mSyncSpeakerCalled: false,
  mSetCallerContactImageCalled: false,
  mSetDefaultContactImageCalled: false,
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
    this.mShowStatusMessageCalled = false;
    this.mCalledCreateTicker = false;
    this.mCalledStopTicker = false;
    this.calls = document.createElement('div');
    this.screen = document.createElement('div');
    this.incomingContainer = document.createElement('div');
    this.incomingNumber = document.createElement('div');
    this.mSingleLine = null;
    this.mGroupDetailsShown = false;
  }
};


