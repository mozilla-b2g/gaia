var MockAppWindowHelper = {
  mInstances: [],
  mLatest: null
};

var MockAppWindow = function AppWindow(config) {
  this.open = function() {};
  this.close = function() {};
  this.kill = function() {};
  this.toggle = function() {};
  this.readyToOpen = function() {};
  this.isActive = function() {};
  this.changeURL = function() {};
  this.resize = function() {};
  this.setVisible = function() {};
  this.blur = function() {};
  this.publish = function() {};
  this._publish = function() {};
  this.inProcess = false;
  this.isHomescreen = false;
  this.config = config;
  this.origin = config.origin;
  this.manifestURL = config.origin;
  this.manifest = config.manifest;
  this.element = document.createElement('div');
  MockAppWindowHelper.mInstances.push(this);
  MockAppWindowHelper.mLatest = this;
};

MockAppWindow.mTeardown = function() {
  MockAppWindowHelper.mInstances = [];
  MockAppWindowHelper.mLatest = null;
};
