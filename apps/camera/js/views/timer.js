define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */
var debug = require('debug')('view:selftimer');
var View = require('vendor/view');

/**
 * Exports
 */

/**
 * Timer
 *
 * Events:
 *
 *   - `start`
 *   - `end`
 *   - `clear`
 *
 * @constructor
 */
module.exports = View.extend({
  name:'timer',
  near: 3,

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.count = this.find('.js-count');
  },

  set: function(time) {
    var isNear = time <= this.near;
    this.els.count.textContent = time;
    this.el.classList.toggle('near', isNear);
    this.time = time;
    debug('set time: %s, near: %s', time, isNear);
    return this;
  },

  start: function() {
    if (this.time && !this.active) {
      this.interval = setInterval(this.decrement, 1000);
      this.el.classList.add('visible');
      this.active = true;
      this.emit('start');
      debug('started');
    }
    return this;
  },

  clear: function(silent) {
    if (!this.active) { return; }
    this.el.classList.remove('visible');
    clearInterval(this.interval);
    this.active = false;
    this.time = 0;
    if (!silent) { this.emit('clear'); }
    debug('cleared');
  },

  decrement: function() {
    this.set(this.time - 1);
    if (!this.time) {
      this.emit('end');
      this.clear(true);
    }
  },

  template: function() {
    return '<div class="timer_count js-count"></div>';
  }
});

});