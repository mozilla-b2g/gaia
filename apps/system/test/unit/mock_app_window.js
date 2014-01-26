var MockAppWindowHelper = {
  mInstances: [],
  mLatest: null
};

var MockAppWindow = function AppWindow(config) {
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
  MockAppWindowHelper.mInstances.push(this);
  MockAppWindowHelper.mLatest = this;
  this.determineClosingRotationDegree = function() { return 0; };
  this.isTransitioning = function() { return false; };
  this.calibratedHeight = function() { return false; };
  this.isOOP = function() { return true; };
  this.isDead = function() { return false};
};

MockAppWindow.mTeardown = function() {
  MockAppWindowHelper.mInstances = [];
  MockAppWindowHelper.mLatest = null;
};

// Populate the object prototype.
// This is necessary so classes that inherit from AppWindow will
// work properly in unit tests.
var mockAppWindowPrototype = [
  'open', 'close', 'kill', 'toggle', 'ready', 'isActive',
  'changeURL', 'resize', 'setVisible', 'blur', 'publish',
  'broadcast', 'fadeIn', 'fadeOut', 'setOrientation', 'focus',
  'blur', 'debug', 'tryWaitForFullRepaint', 'waitForNextPaint',
  'forward', 'canGoForward', 'canGoBack', 'back', 'reload',
  'isFullScreen', '_changeState', '_setVisible', 'modifyURLatBackground'];

mockAppWindowPrototype.forEach(function(funcName) {
  MockAppWindow.prototype[funcName] = function() {};
});
