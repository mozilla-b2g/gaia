'use strict';

(function(exports) {
  var _id = 0;
  var MockAttentionWindowHelper = {
    mInstances: [],
    mLatest: null
  };

  var MockAttentionWindow = function AttentionWindow(config) {
    this.instanceID = 'mock-attention-' + _id++;
    this.open = function() {};
    this.close = function() {};
    this.kill = function() {};
    this.toggle = function() {};
    this.ready = function() {};
    this.isActive = function() {};
    this.changeURL = function() {};
    this.resize = function() {};
    this.setVisible = function() {};
    this.blur = function() {};
    this.publish = function() {};
    this.broadcast = function() {};
    this.fadeIn = function() {};
    this.fadeOut = function() {};
    this.setOrientation = function() {};
    this.focus = function() {};
    this.blur = function() {};
    this.debug = function() {};
    this.tryWaitForFullRepaint = function() {};
    this.waitForNextPaint = function() {};
    this.forward = function() {};
    this.canGoForward = function() {};
    this.canGoBack = function() {};
    this.back = function() {};
    this.reload = function() {};
    this.isFullScreen = function() {};
    this._changeState = function() {};
    this._setVisible = function() {};
    this.modifyURLatBackground = function() {};
    if (config) {
      for (var key in config) {
        this[key] = config[key];
      }
    }
    this.isHomescreen = false;
    this.config = config;
    this.element = document.createElement('div');
    this.browser = {
      element: document.createElement('iframe')
    };
    this.determineClosingRotationDegree = function() { return 0; };
    this.isTransitioning = function() { return false; };
    this.calibratedHeight = function() { return false; };
    this.isOOP = function() { return true; };
    this.isDead = function() { return false; };
    this.hasAttentionPermission = function() { return false; };
    this.requestOpen = function() {};

    MockAttentionWindowHelper.mInstances.push(this);
    MockAttentionWindowHelper.mLatest = this;
  };

  MockAttentionWindow.mTeardown = function() {
    MockAttentionWindowHelper.mInstances = [];
    MockAttentionWindowHelper.mLatest = null;
  };
  exports.MockAttentionWindow = MockAttentionWindow;
}(window));

