/* exported MockCallScreen */

'use strict';

var MockCallScreen = {
  /**
   * Setting mScenario to a non-valid value taking into consideration the
   *  possible scenario values as declared in FontSizeManager.
   */
  mScenario: -1,
  callEndPromptTime: 2000,

  init: function() {},
  insertCall: function() {},
  enablePlaceNewCallButton: function() {
    this.menablePlaceNewCallButtonCalled = true;
  },
  disablePlaceNewCallButton: function() {
    this.menablePlaceNewCallButtonCalled = false;
  },
  enableMuteButton: function() {
    this.menableMuteButtonCalled = true;
  },
  disableMuteButton: function() {
    this.menableMuteButtonCalled = false;
  },
  enableSpeakerButton: function() {
    this.menableSpeakerButtonCalled = true;
  },
  disableSpeakerButton: function() {
    this.menableSpeakerButtonCalled = false;
  },
  showOnHoldButton: function() {
    this.mshowOnHoldButtonCalled = true;
  },
  hideOnHoldButton: function() {
    this.mhideOnHoldButtonCalled = true;
  },
  enableOnHoldButton: function() {
    this.menableOnHoldButtonCalled = true;
  },
  disableOnHoldButton: function() {
    this.menableOnHoldButtonCalled = false;
  },
  showMergeButton: function() {
    this.mShowMergeButtonCalled = true;
  },
  hideMergeButton: function() {
    this.mhideMergeButtonCalled = true;
  },
  showOnHoldAndMergeContainer: function() {},
  hideOnHoldAndMergeContainer: function() {},
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
  switchToDefaultOut: function() {
    this.mSpeakerOn = false;
  },
  switchToSpeaker: function() {
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
  setBTReceiverIcon: function() {},
  createTicker: function(node) {
    this.mCalledCreateTicker = true;
  },
  stopTicker: function(node) {
    this.mCalledStopTicker = true;
  },
  updateCallsDisplay: function() {
    this.mUpdateSingleLineCalled = true;
  },
  removeCall: function() {
    this.mRemoveCallCalled = true;
  },
  hidePlaceNewCallButton: function() {},
  showPlaceNewCallButton: function() {},
  setShowIsHeld: function() {},
  cdmaConferenceCall: function() {},
  removeEndedCalls: function() {},
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

  getScenario: function() {
    this.mGetScenarioCalled = true;
    return this.mScenario;
  },

  mGetScenarioCalled: false,

  // Fake dom
  calls: document.createElement('div'),
  screen: document.createElement('div'),
  incomingContainer: document.createElement('div'),
  incomingInfo: document.createElement('div'),
  incomingNumber: document.createElement('div'),
  incomingSim: document.createElement('div'),
  incomingNumberAdditionalTel: document.createElement('span'),
  incomingNumberAdditionalTelType: document.createElement('span'),

  menablePlaceNewCallButtonCalled: false,
  menableMuteButtonCalled: false,
  menableSpeakerButtonCalled: false,
  mshowOnHoldButtonCalled: false,
  mhideOnHoldButtonCalled: false,
  menableOnHoldButtonCalled: false,
  mShowMergeButtonCalled: false,
  mhideMergeButtonCalled: false,
  mSyncSpeakerCalled: false,
  mSetCallerContactImageCalled: false,
  mMuteOn: false,
  mSpeakerOn: false,
  mLastRenderMode: null,
  mTeardown: function teardown() {
    this.menablePlaceNewCallButtonCalled = false;
    this.menableMuteButtonCalled = false;
    this.menableSpeakerButtonCalled = false;
    this.mshowOnHoldButtonCalled = false,
    this.mhideOnHoldButtonCalled = false,
    this.menableOnHoldButtonCalled = false,
    this.mShowMergeButtonCalled = false,
    this.mhideMergeButtonCalled = false,
    this.mSyncSpeakerCalled = false;
    this.mSetCallerContactImageCalled = false;
    this.mMuteOn = false;
    this.mSpeakerOn = false;
    this.mLastRenderMode = null;
    this.mShowIncomingCalled = false;
    this.mHideIncomingCalled = false;
    this.mShowStatusMessageCalled = false;
    this.mCalledCreateTicker = false;
    this.mCalledStopTicker = false;
    this.mUpdateSingleLineCalled = false;
    this.calls = document.createElement('div');
    this.screen = document.createElement('div');
    this.incomingContainer = document.createElement('div');
    this.incomingInfo = document.createElement('div');
    this.incomingNumber = document.createElement('div');
    this.incomingNumberAdditionalTel = document.createElement('span');
    this.incomingNumberAdditionalTelType = document.createElement('span');
    this.mRemoveCallCalled = false;
    this.mGetScenarioCalled = false;
  }
};
