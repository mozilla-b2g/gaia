define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:recording-timer');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new RecordingTimerController(app);
};

function RecordingTimerController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.recordingTimerView = app.views.recordingTimer;
  this.bindEvents();
  debug('initialized');
}

RecordingTimerController.prototype.bindEvents = function() {
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:timeupdate', this.recordingTimerView.setValue);
  debug('events bound');
};

RecordingTimerController.prototype.onRecordingChange = function(recording) {
  if (recording) {
    this.recordingTimerView.setValue(0);
    this.recordingTimerView.show();
  }

  else {
    this.recordingTimerView.hide();
  }
};

});
