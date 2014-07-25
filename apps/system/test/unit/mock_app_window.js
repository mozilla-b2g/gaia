'use strict';

(function(exports) {
  var _id = 0;

  var MockAppWindowHelper = {
    mInstances: [],
    mLatest: null
  };
  var MockAppWindow = function AppWindow(config) {
    if (config) {
      for (var key in config) {
        this[key] = config[key];
      }
      this.config = config;
    }
    this.instanceID = 'mock-app-' + _id++;
    this.groupID = this.instanceID;
    MockAppWindowHelper.mInstances.push(this);
    MockAppWindowHelper.mLatest = this;
  };
  MockAppWindow.prototype = {
    isHomescreen: false,
    get element() {
      if (!this._element) {
        this._element = document.createElement('div');
      }
      return this._element;
    },
    get browser() {
      if (!this._iframe) {
        this._iframe = document.createElement('iframe');
        this._iframe.download = function() {};
      }
      return {
        element: this._iframe
      };
    },
    render: function() {},
    open: function() {},
    close: function() {},
    kill: function() {},
    toggle: function() {},
    ready: function() {},
    isActive: function() {},
    changeURL: function() {},
    resize: function() {},
    setVisible: function() {},
    setVisibleForScreenReader: function() {},
    blur: function() {},
    publish: function() {},
    broadcast: function() {},
    fadeIn: function() {},
    fadeOut: function() {},
    show: function() {},
    hide: function() {},
    queueShow: function() {},
    cancelQueuedShow: function() {},
    queueHide: function() {},
    setOrientation: function() {},
    focus: function() {},
    debug: function() {},
    tryWaitForFullRepaint: function() {},
    waitForNextPaint: function() {},
    forward: function() {},
    canGoForward: function() {},
    canGoBack: function() {},
    back: function() {},
    reload: function() {},
    isBrowser: function() {},
    isCertified: function() {},
    navigate: function() {},
    isFullScreen: function() {},
    _changeState: function() {},
    _setVisible: function() {},
    _setVisibleForScreenReader: function() {},
    modifyURLatBackground: function() {},
    getFrameForScreenshot: function() { return this.browser.element; },
    getTopMostWindow: function() { return this; },
    determineClosingRotationDegree: function() { return 0; },
    isTransitioning: function() { return false; },
    calibratedHeight: function() { return false; },
    isOOP: function() { return true; },
    isDead: function() { return false; },
    reviveBrowser: function() {},
    getPrev: function() { return undefined; },
    getNext: function() { return undefined; },
    getRootWindow: function() { return this; },
    getLeafWindow: function() { return this; },
    getActiveWindow: function() { return this; },
    requestOpen: function() {},
    transitionController: {
      clearTransitionClasses: function() {}
    },
    enterTaskManager: function() {},
    leaveTaskManager: function() {},
    applyStyle: function() {},
    unapplyStyle: function() {},
    transform: function() {},
    hideContextMenu: function() {},
    lockOrientation: function() {},
    isVisible: function() {}
  };
  MockAppWindow.mTeardown = function() {
    MockAppWindowHelper.mInstances = [];
    MockAppWindowHelper.mLatest = null;
    _id = 0;
  };
  exports.MockAppWindow = MockAppWindow;
  exports.MockAppWindowHelper = MockAppWindowHelper;
}(window));
