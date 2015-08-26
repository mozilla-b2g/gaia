define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:countdown');
var View = require('view');

/**
 * Exports
 */

/**
 * Countdown
 *
 * @constructor
 */
module.exports = View.extend({
  name: 'countdown',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.count = this.find('.js-count');

    // Clean up
    delete this.template;

    debug('rendered');
    return this;
  },

  set: function(time) {

    // Update the number
    this.els.count.textContent = time;

    // Trigger the shrink animation
    this.el.classList.remove('shrink');
    this.reflow = this.el.offsetTop;
    this.el.classList.add('shrink');

    debug('set time: %s, near: %s', time);
    return this;
  },

  show: function() {
    this.el.classList.remove('hidden');
    this.el.classList.add('visible');
  },

  hide: function(callback) {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
    setTimeout(callback, 200);
    return this;
  },

  setImmanent: function(value) {
    this.el.classList.toggle('immanent', value);
  },

  reset: function() {
    this.els.count.textContent = '';
    this.el.classList.remove('immanent', 'shrink');
    return this;
  },

  template: function() {
    return '<div class="countdown_circle-1"></div>' +
      '<div class="countdown_circle-2"></div>' +
      '<div class="countdown_count">' +
        '<div class="rotates js-count"></div>' +
      '</div>';
  }
});

});
