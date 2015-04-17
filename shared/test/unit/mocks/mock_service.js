/* exported MockService */
'use strict';
var MockService = {
  mSetup: function() {
    this.mWallpaper = null;
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
    this.mIsFileTransferInProgress = false;
    this.mIsSendFileQueueEmpty = false;
    this.mDeviceType = '';
    this.mInputWindowManager_getHeight = 0;
    this.mSoftwareButtonManager_width = 0;
    this.mSoftwareButtonManager_height = 0;
    this.mLayoutManager_height = window.innerHeight;
    this.mLayoutManager_getHeight = window.innerHeight;
    this.mLayoutManager_width = window.innerWidth;
    this.mStatusBar_height = 30;
    this.mHomescreen = null;
    this.mHomescreenReady = false;
    this.mSlowTransition = false;
    this.mKeyboardEnabled = false;
    this.mKeyboardHeight = 0;
    this.mGetApp = null;
    this.mActiveApp = null;
    this.mDefaultOrientation = 'portrait-primary';
    this.mIsDefaultPortrait = true;
    this.mGlobalOrientation = null;
    this.mCurrentOrientation = 'portrait-primary';
    this.mIsOutOfProcessEnabled = true;
    this.mJustUpgraded = false;
    this.mCurrentApp = null;
    this.mActiveAttention = null;
    this.mDataIcon = null;
    this.mSuspendingAppWindow = true;
    this.mIsOnRealDevice = true;
    this.mUtilityTray_shown = false;
    this.mIsBusyLoading = false;
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
      case 'getWallpaper':
        return this.mWallpaper;
      case 'isBusyLoading':
        return this.mIsBusyLoading;
      case 'UtilityTray.shown':
        return this.mUtilityTray_shown;
      case 'isOnRealDevice':
        return this.mIsOnRealDevice;
      case 'suspendingAppWindow':
        return this.mSuspendingAppWindow;
      case 'StatusBar.height':
        return this.mStatusBar_height;
      case 'InputWindowManager.getHeight':
        return this.mInputWindowManager_getHeight;
      case 'dataIcon':
        return this.mDataIcon;
      case 'AttentionWindowManager.hasActiveWindow':
        return this.mActiveAttention;
      case 'justUpgraded':
        return this.mJustUpgraded;
      case 'InputWindowManager.isOutOfProcessEnabled':
        return this.mIsOutOfProcessEnabled;
      case 'fetchCurrentOrientation':
        return this.mCurrentOrientation;
      case 'globalOrientation':
        return this.mGlobalOrientation;
      case 'defaultOrientation':
        return this.mDefaultOrientation;
      case 'isDefaultPortrait':
        return this.mIsDefaultPortrait;
      case 'AppWindowManager.getActiveApp':
      case 'AppWindowManager.getActiveWindow':
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
      case 'SoftwareButtonManager.height':
        return this.mSoftwareButtonManager_height;
      case 'SoftwareButtonManager.width':
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
      case 'BluetoothTransfer.isFileTransferInProgress':
        return this.mIsFileTransferInProgress;
      case 'BluetoothTransfer.isSendFileQueueEmpty':
        return this.mIsSendFileQueueEmpty;
      case 'getDeviceType':
        return this.mDeviceType;
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
