define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:recording-timer');
var RecordingTimerView = require('views/recording-timer');

/**
 * Exports
 */

module.exports = function(app) { return new RecordingTimerController(app); };
module.exports.RecordingTimerController = RecordingTimerController;

/**
 * Initialize a new `RecordingTimerController`
 *
 * Allow `this.view` to be mocked for testing
 *
 * @param {App} app
 */
function RecordingTimerController(app) {
  debug('initializing');
  this.onRecordingChange = this.onRecordingChange.bind(this);
  this.view = app.view || new RecordingTimerView();
  this.app = app;
  this.setup();
  this.bindEvents();
  debug('initialized');
}

/**
 * Inject the view into the app.
 *
 * @private
 */
RecordingTimerController.prototype.setup = function() {
  this.view.appendTo(this.app.el);
};

/**
 * Listen to relevant events.
 *
 * Toggle the visibility when
 * recording starts/stops.
 *
 * Update the time value when camera
 * recording time updates.
 *
 * @private
 */
RecordingTimerController.prototype.bindEvents = function() {
  this.app.on('change:recording', this.onRecordingChange);
  this.app.on('camera:recorderTimeUpdate', this.view.value);
  debug('events bound');
};

/**
 * Show the view when recording,
 * hide it when not.
 *
 * @param  {Boolean} recording
 * @private
 */
RecordingTimerController.prototype.onRecordingChange = function(recording) {
  debug('recording: %s', recording);
  if (!recording) {
    this.view.hide();
    return;
  }

  this.view.value(0);
  this.view.show();
};

});
