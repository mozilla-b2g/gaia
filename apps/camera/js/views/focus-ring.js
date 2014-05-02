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
  name: 'focus-ring',

  initialize: function() {
    this.render();
    this.setState('none');
  },
  render: function() {
    this.el.innerHTML = this.template();
    this.els.ring = this.find('.js-ring');
  },

  setState: function(state) {
    this.set('state', state);
  },

  setMode: function(mode) {
    this.setDefaultValues();
    this.set('mode', mode);
  },

  changePosition: function(x, y) {
    this.setDefaultValues();
    this.els.ring.style.transform = 'translate('+x+'px, '+y+'px)';
  },

  /* 
   * When ever Focus Mode is change 
   * We set the focus ring on default position
   * eg. in Touch Focus we change the position of Focus ring
   * when it will come back we need to set it again to the default position
   */
  setDefaultValues: function() {
    this.els.ring.style.transform = 'translate(-50%, -50%)';
  },

  template: function() {
    return '<div class="focusring icon-focus-locking js-ring"></div>';
  },

});

});
