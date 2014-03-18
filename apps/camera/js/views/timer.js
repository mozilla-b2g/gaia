define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:timer');
var View = require('vendor/view');

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
    this.els.count.textContent = time;
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

  template: function() {
    return '<div class="timer_count js-count rotates"></div>';
  }
});

});
