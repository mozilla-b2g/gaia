define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('view');

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

  setDiameter: function(diameter) {
    this.el.style.width = diameter + 'px';
    this.el.style.height = diameter + 'px';
  }

});

});
