define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:timer');
var View = require('view');

/**
 * Exports
 */

/**
 * Timer
 *
 * @constructor
 */
module.exports = View.extend({
  name:'timer',
  immanent: 3,

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.count = this.find('.js-count');
  },

  set: function(time) {
    var isImmanent = time <= this.immanent;

    // Update the number
    this.els.count.textContent = time;

    // Trigger the shrink animation
    this.el.classList.remove('shrink');
    this.reflow = this.el.offsetTop;
    this.el.classList.add('shrink');

    // Flag immanent & emit event
    this.el.classList.toggle('immanent', isImmanent);
    if (isImmanent) { this.emit('timer:immanent'); }

    debug('set time: %s, near: %s', time, isImmanent);
    return this;
  },

  show: function() {
    this.el.classList.remove('hidden');
    this.el.classList.add('visible');
  },

  hide: function() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  },

  reset: function() {
    this.els.count.textContent = '';
    this.el.classList.remove('immanent');
  },

  template: function() {
    return '<div class="timer_circle-1"></div>' +
      '<div class="timer_circle-2"></div>' +
      '<div class="timer_count">' +
        '<div class="rotates js-count"></div>' +
      '</div>';
  }
});

});
