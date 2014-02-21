define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:timer');
var TimerView = require('views/timer');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new TimerController(app); };
module.exports.TimerController = TimerController;

/**
 * Create a new `TimerController`
 *
 * We make the setup method async so
 * that events are not called in the
 * same synchronous turn in which they
 * are bound.
 *
 * @param {App} app [description]
 */
function TimerController(app) {
  bindAll(this);
  this.app = app;
  this.timer = app.views.timer || new TimerView();
  this.bindTimerEvents = async(this.bindTimerEvents);
  this.setting = this.app.settings.timer;
  this.timer.appendTo(app.el);
  this.bindEvents();
}

/**
 * Connects the timer view
 * with the app via events.
 *
 * @private
 */
TimerController.prototype.bindEvents = function() {
  this.timer.on('start', this.app.firer('timer:start'));
  this.timer.on('clear', this.app.firer('timer:clear'));
  this.app.on('capture', this.onCapture);
};

/**
 * Will start a timer only if it is
 * set, and the camera is not currently
 * recording.
 *
 * Returning false prevents any further
 * 'capture' listeners firing. Similiar to
 * event.stopImmediatePropagation();
 *
 * @private
 */
TimerController.prototype.onCapture = function() {
  var time = this.setting.selected('value');
  var recording = this.app.get('recording');
  var startTimer = time && !recording;
  if (startTimer) {
    this.startTimer(time);
    return false;
  }
};

/**
 * Start the timer counting and
 * begin listening to events.
 *
 * @private
 */
TimerController.prototype.startTimer = function(time) {
  this.timer.set(time);
  this.timer.start();
  this.bindTimerEvents();
  debug('set timer: %s', time);
};

/**
 * When the app is clicked we cancel
 * the timer. Also respond to when the
 * timer is cleared, or ends.
 *
 * These events are only bound when
 * the timer is counting to avoid complex
 * conflicts with other app interactions
 * when not needed.
 *
 * @private
 */
TimerController.prototype.bindTimerEvents = function() {
  this.timer.on('clear', this.unbindTimerEvents);
  this.timer.on('end', this.onTimerEnd);
  this.app.on('click', this.timer.clear);
  this.app.on('blur', this.timer.clear);
};

/**
 * Unbind the timer events when
 * they are no longer needed.
 *
 * @private
 */
TimerController.prototype.unbindTimerEvents = function() {
  this.timer.off('clear', this.unbindTimerEvents);
  this.timer.off('end', this.onTimerEnd);
  this.app.off('click', this.timer.clear);
  this.app.off('blur', this.timer.clear);
};

/**
 * Fire an app event that will be
 * used to trigger the camera to
 * take a picture or begin recording.
 *
 * @private
 */
TimerController.prototype.onTimerEnd = function() {
  this.app.fire('timer:end');
  this.unbindTimerEvents();
};

/**
 * Make a function asynchronous.
 *
 * @param  {Function} fn
 * @return {Function}
 */
function async(fn) {
  return function() { setTimeout(fn); };
}

});
