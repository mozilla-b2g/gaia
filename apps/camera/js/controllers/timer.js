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
  this.sounds = app.sounds;
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
  this.view.on('timer:immanent', this.beep);
  this.app.on('blur', this.clear);
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
  if (!(--this.seconds)) {
    this.app.emit('timer:ended');
    this._clear();
    return;
  }

  this.view.set(this.seconds);
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
  clearInterval(this.interval);
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

/**
 * Plays a beep sound.
 *
 * We don't have specific sound file for beep
 * so we are using recordingEnd sound for this.
 *
 * @private
 */
TimerController.prototype.beep = function() {
  this.sounds.play('recordingEnd');
};

});
