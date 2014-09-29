'use strict';
(function(exports) {
  var MockActivityWindowHelper = {
    mInstances: [],
    mLatest: null
  };

  var MockActivityWindow = function ActivityWindow(config) {
    this.instanceID = 'mock-activity-' +
      MockActivityWindowHelper.mInstances.length;
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
    this.ensureFullRepaint = function() {};
    this.forward = function() {};
    this.canGoForward = function() {};
    this.canGoBack = function() {};
    this.back = function() {};
    this.reload = function() {};
    this.isFullScreen = function() {};
    this.isHomescreen = false;
    this.config = config;
    this.origin = config.origin;
    this.manifestURL = config.manifestURL;
    this.manifest = config.manifest;
    this.url = config.url;
    this.element = document.createElement('div');
    this.browser = {
      element: document.createElement('iframe')
    };
    this.determineClosingRotationDegree = function() { return 0; };
    this.isTransitioning = function() { return false; };
    this.calibratedHeight = function() { return false; };
    this.isOOP = function() { return true; };
    this.isDead = function() { return false; };
    MockActivityWindowHelper.mInstances.push(this);
    MockActivityWindowHelper.mLatest = this;
  };

  MockActivityWindow.mTeardown = function() {
    MockActivityWindowHelper.mInstances = [];
    MockActivityWindowHelper.mLatest = null;
  };
  exports.MockActivityWindow = MockActivityWindow;
}(window));
