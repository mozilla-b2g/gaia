define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'face',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.el.classList.add('js-face');
  },

  setPosition: function(x, y) {
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  },

  setRadius: function(radius) {
    this.el.style.width = radius + 'px';
    this.el.style.height = radius + 'px';
  }

});

});
