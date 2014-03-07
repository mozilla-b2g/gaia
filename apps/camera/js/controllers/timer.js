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
  this.settings = app.settings;
  this.view = app.views.timer || new TimerView();
  this.view.appendTo(app.el);
  this.bindEvents();
}

/**
 * Connects the timer view
 * with the app via events.
 *
 * @private
 */
TimerController.prototype.bindEvents = function() {
  this.app.on('startcountdown', this.start);
};

/**
 * Start the timer counting down
 * from the currently set timer value.
 *
 * We bind to the app event asynchronously
 * so that the timer isn't instantly
 * cleared by the 'click' that started it.
 *
 * @private
 */
TimerController.prototype.start = function() {
  this.seconds = this.settings.timer.selected('value');
  this.interval = setInterval(this.tick, 1000);
  this.view.set(this.seconds).show();
  setTimeout(this.bindTimerEvents);
  this.app.set('timerActive', true);
  this.app.emit('timer:started');
  debug('started');
};

/**
 * Updates the timer and checks
 * if it has reached the end.
 *
 * @private
 */
TimerController.prototype.tick = function() {
  this.view.set(--this.seconds);
  if (!this.seconds) {
    this.app.emit('timer:ended');
    this.clear({ silent: true });
  }
};

/**
 * Clear the timer and hide
 * the view.
 *
 * Options:
 *
 *   - `silent` no 'clear' event
 *
 * @param  {Object} options
 * @private
 */
TimerController.prototype.clear = function(options) {
  var silent = options && options.silent;
  clearInterval(this.interval);
  this.unbindTimerEvents();
  this.view.hide();
  this.seconds = 0;
  this.app.set('timerActive', false);
  if (!silent) { this.app.emit('timer:cleared'); }
  debug('cleared');
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
  this.app.on('click', this.clear);
  this.app.on('blur', this.clear);
};

/**
 * Unbind the timer events when
 * they are no longer needed.
 *
 * @private
 */
TimerController.prototype.unbindTimerEvents = function() {
  this.app.off('click', this.clear);
  this.app.off('blur', this.clear);
};

});
