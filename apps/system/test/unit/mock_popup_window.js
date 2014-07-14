'use strict';

(function(exports) {
  var _id = 0;

  exports.MockPopupWindowHelper = {
    mInstances: [],
    mLatest: null
  };

  var MockPopupWindow = function PopupWindow(config) {
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
    exports.MockPopupWindowHelper.mInstances.push(this);
    exports.MockPopupWindowHelper.mLatest = this;
    this.determineClosingRotationDegree = function() { return 0; };
    this.isTransitioning = function() { return false; };
    this.calibratedHeight = function() { return false; };
    this.isOOP = function() { return true; };
    this.isDead = function() { return false; };
    this.reviveBrowser = function() {};
    this.getPrev = function() { return undefined; };
    this.getNext = function() { return undefined; };
    var self = this;
    this.getRootWindow = function() { return self; };
    this.getLeafWindow = function() { return self; };
    this.getActiveWindow = function() { return self; };
    this.requestOpen = function() {};
    this.instanceID = 'mock-popup-' + _id++;
    this.groupID = this.instanceID;
  };

  MockPopupWindow.mTeardown = function() {
    exports.MockPopupWindowHelper.mInstances = [];
    exports.MockPopupWindowHelper.mLatest = null;
    _id = 0;
  };

  exports.MockPopupWindow = MockPopupWindow;
}(window));
