'use strict';

(function(exports) {
  var MockToaster = {
    _mInited: false,
    _lastToast: undefined,
    isInitialized: function mt_isInitialized() {
      return this._mInited;
    },
    showToast: function mt_showToast(options) {
      this._lastToast = options;
    },
    mSetup: function mt_mSetup() {
      this._mInited = true;
    },
    mTeardown: function mt_mTeardown() {
      this._mInited = false;
    }
  };
  exports.MockToaster = MockToaster;
}(window));
