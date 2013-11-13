var MockAppWindowHelper = {
  mInstances: [],
  mLatest: null
};

var MockAppWindow = function AppWindow(config) {
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
  this.inProcess = false;
  this.isHomescreen = false;
  this.config = config;
  this.origin = config.origin;
  this.manifestURL = config.origin;
  this.manifest = config.manifest;
  this.element = document.createElement('div');
  this.browser = {
    element: document.createElement('iframe')
  };
  MockAppWindowHelper.mInstances.push(this);
  MockAppWindowHelper.mLatest = this;
};

MockAppWindow.mTeardown = function() {
  MockAppWindowHelper.mInstances = [];
  MockAppWindowHelper.mLatest = null;
};
