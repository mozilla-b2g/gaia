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
  debug('initialized');
}

/**
 * Connects the timer view
 * with the app via events.
 *
 * @private
 */
TimerController.prototype.bindEvents = function() {
  this.app.on('startcountdown', this.start);
  this.app.on('hidden', this.clear);
  this.view.on('timer:immanent', this.app.firer('timer:immanent'));
};

/**
 * Start the timer counting down
 * from the currently set timer value.
 *
 * Don't allow timer to start if
 * one is already active.
 *
 * We bind to app events asynchronously
 * so that the timer isn't instantly
 * cleared by the 'click' that started it.
 *
 * @private
 */
TimerController.prototype.start = function() {
  if (this.app.get('timerActive')) { return; }

  this.seconds = this.settings.timer.selected('value');
  this.view.set(this.seconds).show();
  setTimeout(this.bindTimerEvents);
  this.scheduleTick();

  this.app.set('timerActive', true);
  this.app.emit('timer:started');

  debug('started');
};

/**
 * Schedule the next tick.
 *
 * Make sure to clear any existing
 * timeout to be absolutely sure that
 * only one timeout is ever pending.
 *
 * @private
 */
TimerController.prototype.scheduleTick = function() {
  clearTimeout(this.timeout);
  this.timeout = setTimeout(this.tick, 1000);
};

/**
 * Decrements the timer and checks
 * if its still has second left.
 *
 * If no time remains, an 'ended'
 * event is fired and the timer
 * is cleared.
 *
 * If time does remain, we update
 * the view.
 *
 * @private
 */
TimerController.prototype.tick = function() {
  if (--this.seconds <= 0) {
    this.app.emit('timer:ended');
    this._clear();
    return;
  }

  this.view.set(this.seconds);
  this.scheduleTick();
};

/**
 * Call ._clear() and fire 'cleared' event.
 *
 * @param  {Object} options
 * @private
 */
TimerController.prototype.clear = function() {
  this._clear();
  this.app.emit('timer:cleared');
};

/**
 * Clear the timer and hide
 * the view.
 *
 * @param  {Object} options
 * @private
 */
TimerController.prototype._clear = function() {
  clearTimeout(this.timeout);
  this.unbindTimerEvents();
  this.view.hide();
  this.view.reset();
  this.app.set('timerActive', false);
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
};

/**
 * Unbind the timer events when
 * they are no longer needed.
 *
 * @private
 */
TimerController.prototype.unbindTimerEvents = function() {
  this.app.off('click', this.clear);
};

});
