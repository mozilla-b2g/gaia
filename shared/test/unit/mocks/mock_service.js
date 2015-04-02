/* exported MockService */
'use strict';
var MockService = {
  mTeardown: function() {
    this.runningFTU = false;
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
      case 'isFtuRunning':
        return this.runningFTU;
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
  runningFTU: false,
  mBtEnabled: false,
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp',
  currentApp: null
};
