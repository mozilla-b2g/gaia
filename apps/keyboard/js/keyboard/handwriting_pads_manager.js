'use strict';

/* global HandwritingPadSettings */

(function(exports) {

var HandwritingPadsManager = function(app) {
  this._started = false;
  this._timeOutId = undefined;
  this._strokeWidth = 5;
  this._responseTime = 600;

  // It's a one dimension array, contains uer press positions data,
  // and the data in it looks like:
  // [ point0.X, point0.Y, point1.X, point1.Y,  ... pointN.X, pointN.Y,  -1, 0 ]
  this._strokePoints = [];

  this._currentTarget = null;
  this._cleared = false;

  this.app = app;
};

HandwritingPadsManager.prototype.MAX_RESPONSE_TIME = 1100;

HandwritingPadsManager.prototype.start = function() {
  if (this._started) {
    throw new Error('HandwritingPadsManager: ' +
      'Instance should not be start()\'ed twice.');
  }

  this.handwritingPadSettings = new HandwritingPadSettings();
  this.handwritingPadSettings.promiseManager = this.app.settingsPromiseManager;
  this.handwritingPadSettings.onsettingchange =
    this._handleSettingsChange.bind(this);
  this.handwritingPadSettings.initSettings().then(
    this._handleSettingsChange.bind(this),
    function rejected() {
      console.error('Fatal Error! Failed to get initial ' +
                    'handwriting pad settings.');
    });

  this._started = true;
};

HandwritingPadsManager.prototype.stop = function() {
  if (!this._started) {
    throw new Error('HandwritingPadsManager: ' +
      'Instance was never start()\'ed but stop() is called.');
  }
  this.handwritingPadSettings = null;
  this._started = false;
};

HandwritingPadsManager.prototype._handleSettingsChange = function(values) {
  this._strokeWidth = values.strokeWidth;
  this._responseTime = values.responseTime;
};

HandwritingPadsManager.prototype.handlePressStart = function(press) {
  clearTimeout(this._timeOutId);

  if (!this._currentTarget) {
    this._currentTarget = press.target;
  } else if (this._currentTarget != press.target && !this._cleared) {
    // HandwritingPadsManager can manage more than one handwriting pads,
    // if current keyboard contains multiple handwriting IMEs, and switch
    // quickly from one to another, when pressing on the second handwriting
    // pad, maybe the previous handwriting pad is still not cleared, because
    // clearHandwritingPad function is involked in a timer, we can't guarantee
    // it's called in time. We should handle the case here.
    this.app.layoutRenderingManager.clearHandwritingPad(this._currentTarget);
    this._strokePoints = [];
    this._currentTarget = press.target;
  }

  this._cleared = false;
  var point = this.app.layoutRenderingManager.drawHandwritingPad(press,
                                               true, this._strokeWidth);
  this._strokePoints.push(point.posX, point.posY);
};

HandwritingPadsManager.prototype.handlePressMove = function(press) {
  var point = this.app.layoutRenderingManager.drawHandwritingPad(press,
                                              false, this._strokeWidth);
  this._strokePoints.push(point.posX, point.posY);
};

HandwritingPadsManager.prototype.handlePressEnd = function() {
  this._timeOutId = setTimeout(this._sendStrokePoints.bind(this),
                               this.MAX_RESPONSE_TIME - this._responseTime);
  this._strokePoints.push(-1, 0);
};

HandwritingPadsManager.prototype._sendStrokePoints = function() {
  if (this._strokePoints.length <= 1) {
    return;
  }

  var ime = this.app.inputMethodManager.currentIMEngine;
  if (ime.sendStrokePoints) {
    ime.sendStrokePoints(this._strokePoints);
  }

  this.app.layoutRenderingManager.clearHandwritingPad(this._currentTarget);
  this._strokePoints = [];
  this._cleared = true;
};

exports.HandwritingPadsManager = HandwritingPadsManager;

})(window);
