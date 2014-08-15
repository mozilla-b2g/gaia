'use strict';

/* global HandwritingPadSettings, IMERender */

(function(exports) {

var HandwritingPadsManager = function(app) {
  this._started = false;
  this._timeOutId = undefined;
  this._writing = false;
  this._strokeWidth = 5;
  this._responseTime = 600;
  this._strokePoints = [];

  this.app = app;
};

HandwritingPadsManager.prototype.start = function() {
  if (this._started) {
    throw new Error('HandwritingPadsManager: ' +
      'Instance should not be start()\'ed twice.');
  }

  this.handwritingPadSettings = new HandwritingPadSettings();
  this.handwritingPadSettings.promiseManager = this.app.settingsPromiseManager;
  this.handwritingPadSettings.initSettings().catch(function rejected() {
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

HandwritingPadsManager.prototype.handlePressStart = function(press) {
  if (this._writing) {
    return false;
  }
  if (!this._isHandwritingPad(press.target)) {
    return true;
  }

  this._handlePressStart(press);
  return true;
};

HandwritingPadsManager.prototype._handlePressStart = function(press) {
  if (this.handwritingPadSettings.initialized) {
    var values = this.handwritingPadSettings.getSettingsSync();
    this._strokeWidth = values.strokeWidth;
    this._responseTime = values.responseTime;
  }

  clearTimeout(this._timeOutId);

  var point = this._getPressPoint(press);
  this._strokePoints.push(point.x, point.y);
  this._writing = true;
  IMERender.drawCanvas(press.target, point, true, this._strokeWidth);
};

HandwritingPadsManager.prototype.handlePressMove = function(press) {
  var isHandwritingPad = this._isHandwritingPad(press.target);
  if (!isHandwritingPad) {
    return;
  }

  var point = this._getPressPoint(press);
  this._strokePoints.push(point.x, point.y);
  IMERender.drawCanvas(press.target, point, false, this._strokeWidth);
};

HandwritingPadsManager.prototype.handlePressEnd = function(target) {
  if (!this._writing || !this._isHandwritingPad(target)) {
    return false;
  }

  this._handlePressEnd();
  return true;
};

HandwritingPadsManager.prototype._handlePressEnd = function() {
  this._timeOutId = setTimeout(this._sendStrokePoints.bind(this),
                               1100 - this._responseTime);
  this._writing = false;
  this._strokePoints.push(-1, 0);
};

HandwritingPadsManager.prototype.handleMoveIn = function(press) {
  var isHandwritingPad = this._isHandwritingPad(press.target);
  if (!this._writing && isHandwritingPad) {
    this._handlePressStart(press);
  }
};

HandwritingPadsManager.prototype.handleMoveOut = function(target) {
   return this._isHandwritingPad(target);
};

HandwritingPadsManager.prototype._getPressPoint = function(press) {
  var canvasRect = press.target.getBoundingClientRect();
  var posX = canvasRect.left - document.body.clientLeft;
  var posY = canvasRect.top - document.body.clientTop;
  var point = {
    x: (press.clientX - posX) * 2,
    y: (press.clientY - posY) * 2
  };
  return point;
};

HandwritingPadsManager.prototype._sendStrokePoints = function() {
  if (this._strokePoints.length <= 1) {
    return;
  }

  var ime = this.app.inputMethodManager.currentIMEngine;
  if (ime.sendStrokePoints) {
    ime.sendStrokePoints(this._strokePoints);
  }
  IMERender.clearCanvas();
  this._strokePoints = [];
};

HandwritingPadsManager.prototype._isHandwritingPad = function(target) {
  return target.classList.contains('handwriting-pad');
};

exports.HandwritingPadsManager = HandwritingPadsManager;

})(window);
