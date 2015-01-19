/* exported MockService */
'use strict';
var MockService = {
  mTeardown: function() {
    this.mIsFtuRunning = false;
    this.mUpgrading = false;
    this.mBtEnabled = false;
    this.mTopMostUI = null;
    this.mIsHandoverInProgress = false;
    this.mRadioEnabled = false;
    this.mActiveCall = false;
    this.mCDMA = false;
    this.mConnectionType = '';
    this.mInCall = false;
    this.mTopMostWindow = null;
    this.mHeadsetConnected = false;
    this.mInputWindowManager_getHeight = 0;
    this.mSoftwareButtonManager_width = 0;
    this.mSoftwareButtonManager_height = 0;
    this.mLayoutManager_height = window.innerHeight;
    this.mLayoutManager_getHeight = window.innerHeight;
    this.mLayoutManager_width = window.innerWidth;
    this.mHomescreen = null;
    this.mHomescreenReady = false;
    this.mSlowTransition = false;
    this.mKeyboardEnabled = false;
    this.mKeyboardHeight = 0;
    this.mGetApp = null;
    this.mActiveApp = null;
  },
  lowerCapital: function() {
    return 'a';
  },
  lazyLoad: function() {},
  register: function() {},
  unregister: function() {},
  registerState: function() {},
  unregisterState: function() {},
  request: function() {
    return new Promise(function() {});
  },
  query: function(state) {
    switch (state) {
      case 'AppWindowManager.getActiveApp':
        return this.mActiveApp;
      case 'getApp':
        return this.mGetApp;
      case 'keyboardHeight':
        return this.mKeyboardHeight;
      case 'keyboardEnabled':
        return this.mKeyboardEnabled;
      case 'slowTransition':
        return this.mSlowTransition;
      case 'HomescreenWindowManager.ready':
        return this.mHomescreenReady;
      case 'getHomescreen':
        return this.mHomescreen;
      case 'locked':
        return this.locked;
      case 'LayoutManager.width':
        return this.mLayoutManager_width;
      case 'LayoutManager.height':
        return this.mLayoutManager_height;
      case 'getHeightFor':
      case 'LayoutManager.getHeightFor':
        return this.mLayoutManager_height -
          (arguments[2] ? 0 : this.mKeyboardHeight);
      case 'SoftwareButtonMnager.height':
        return this.mSoftwareButtonManager_height;
      case 'SoftwareButtonMnager.width':
        return this.mSoftwareButtonManager_width;
      case 'InputWindowManager.height':
        return this.mInputWindowManager_getHeight;
      case 'getFtuOrigin':
        return 'app://ftu.gaiamobile.org';
      case 'isFtuRunning':
        return this.mIsFtuRunning;
      case 'isFtuUpgrading':
        return this.mUpgrading;
      case 'getTopMostWindow':
        return this.mTopMostWindow;
      case 'getTopMostUI':
        return this.mTopMostUI;
      case 'Bluetooth.isEnabled':
        return this.mBtEnabled;
      case 'getTopMostUI':
        return this.mTopMostUI;
      case 'NfcHandoverManager.isHandoverInProgress':
        return this.mIsHandoverInProgress;
      case 'Radio.enabled':
        return this.mRadioEnabled;
      case 'hasActiveCall':
        return this.mActiveCall;
      case 'isCDMA':
        return this.mCDMA;
      case 'getDataConnectionType':
        return this.mConnectionType;
      case 'inCall':
        return this.mInCall;
      case 'isHeadsetConnected':
        return this.mHeadsetConnected;
    }
    return undefined;
  },
  mPublishEvents: {},
  isBusyLoading: function() {
    return false;
  },
  currentTime: function() {},
  locked: false,
  mBtEnabled: false,
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp',
  currentApp: null
};
