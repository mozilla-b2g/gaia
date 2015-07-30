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
        try {
          this[key] = config[key];
        } catch (e) {

        }
      }
      this.config = config;
    }
    this.instanceID = this.prefix + _id++;
    this.groupID = this.instanceID;
    MockAppWindowHelper.mInstances.push(this);
    MockAppWindowHelper.mLatest = this;
  };
  MockAppWindow.prototype = {
    prefix: 'mock-app-',
    isHomescreen: false,
    CLASS_NAME: 'AppWindow',
    HIERARCHY_MANAGER: 'AppWindowManager',
    get browserContainer() {
      if (!this._browserContainer) {
        this._browserContainer = document.createElement('div');
      }
      return this._browserContainer;
    },
    set element(ele) {
      this._element = ele;
    },
    get element() {
      if (!this._element) {
        this._element = document.createElement('div');
      }
      return this._element;
    },
    get titleBar() {
      if (!this._titleBar) {
        this._titleBar = document.createElement('div');
      }
      return this._titleBar;
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
    set browser(browser) {
      this._iframe = browser.element;
    },
    get frame() {
      return this.element;
    },
    get iframe() {
      if (!this._iframe) {
        this._iframe = document.createElement('iframe');
        this._iframe.download = function() {};
      }
      return this._iframe;
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
    stop: function() {},
    isBrowser: function() {},
    isPrivateBrowser: function() { return false; },
    isCertified: function() {},
    navigate: function() {},
    isFullScreen: function() {},
    isFullScreenLayout: function() {},
    _changeState: function() {},
    _setVisible: function() {},
    _setVisibleForScreenReader: function() {},
    modifyURLatBackground: function() {},
    getFrameForScreenshot: function() { return this.browser.element; },
    getTopMostWindow: function() { return this; },
    getBottomMostWindow: function() { return this; },
    determineClosingRotationDegree: function() { return 0; },
    isTransitioning: function() { return false; },
    isSheetTransitioning: function() { return false; },
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
    isVisible: function() {},
    hasPermission: function() { return false; },
    requestForeground: function() {},
    isHidden: function() { return false; },
    '_resize': function() {},
    isForeground: function() {},
    killable: function() {},
    setVisibileForScreenReader: function() {},
    handleStatusbarTouch: function() {},
    setNFCFocus: function() {},
    setActive: function() {},
    getSSLState: function() { return ''; },
    getCachedScreenshotBlob: function() {},
    requestScreenshotURL: function() {},
    getSiteIconUrl: function() {},
    _showFrame: function() {},
    _hideFrame: function() {}
  };

  MockAppWindow.addMixin = function() {};

  MockAppWindow.mTeardown = function() {
    MockAppWindowHelper.mInstances = [];
    MockAppWindowHelper.mLatest = null;
    _id = 0;
  };
  exports.MockAppWindow = MockAppWindow;
  exports.MockAppWindowHelper = MockAppWindowHelper;
}(window));
