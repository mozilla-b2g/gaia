define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var find = require('lib/find');

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
    this.els.focus = find('.js-focus', this.el);
  },

  setState: function(state) {
    this.set('focus-state', state);
  },

  setMode: function(mode) {
    this.clearFaceRings();
    this.setDefaultValues();
    this.set('focus-mode', mode);
  },
  changePosition: function(x, y) {
    this.setDefaultValues();
    this.els.focus.style.left = x + 'px';
    this.els.focus.style.top = y + 'px';
  },

  setDefaultValues: function() {
    this.els.focus.style.fontSize = '92px';
    this.els.focus.style.transform = 'translate(-50%, -50%)';
  },
  template: function() {
    return '<div class="focusring icon-focus-locking js-focus"></div>';
  },
  clearFaceRings: function() {
    var paras = document.getElementsByClassName('focusring-yellow');
    var i = 0;
    while (paras[i]) {
      paras[i].parentNode.removeChild(paras[i]);
      i++;
    }
  }

});

});
