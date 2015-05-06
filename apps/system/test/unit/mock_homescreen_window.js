'use strict';
/* exported MockHomescreenWindow */

var MockHomescreenWindow = function(value) {
  this.isHomescreen = true;
  this.manifestURL = value;
  this.origin = 'home';
  this.CLASS_NAME = 'HomescreenWindow';
  this.HIERARCHY_MANAGER = 'AppWindowManager';

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
  this.isFullScreenLayout = function() {};
  this._changeState = function() {};
  this._setVisible = function() {};
  this.modifyURLatBackground = function() {};
  this.element = document.createElement('div');
  this.browser = {
    element: document.createElement('iframe')
  };
  this.show = function() {};
  this.requestForeground = function() {};
  this.getBottomMostWindow = function() { return this; };
  this.determineClosingRotationDegree = function() { return 0; };
  this.isTransitioning = function() { return false; };
  this.calibratedHeight = function() { return false; };
  this.isOOP = function() { return true; };
  this.ensure = function() { return this; };
  this.isDead = function() { return false; };
  this.reviveBrowser = function() {};
  this.setNFCFocus = function() {};
};
