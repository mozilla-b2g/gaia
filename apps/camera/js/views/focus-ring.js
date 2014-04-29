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

  tranformRing: function(px, py, size, id) {
    var focusElm = this.getFocusRing(id);
    focusElm.style.transform = 'translate(0px, 0px)';
    focusElm.style.fontSize = size + 'px';
    focusElm.style.transform = 'translate(' + py +
      'px, ' + px + 'px)';
    focusElm.style.top = this.els.focus.offsetTop + 'px';
    focusElm.style.left = this.els.focus.offsetLeft + 'px';
  },

  template: function() {
    return '<div class="focusring icon-focus-locking js-focus"></div>';
  },

  getFocusRing: function(id) {
    var focusRing = document.createElement('div');
    focusRing.id = 'focus-ring-' + id;
    focusRing.classList.add('focusring-yellow');
    focusRing.classList.add('icon-focus-locked');
    this.el.appendChild(focusRing);
    return focusRing;
  },

  setMainFace: function(mainFace) {
    this.els.focus.style.transform = 'translate(0px, 0px)';
    this.els.focus.style.fontSize = mainFace.length + 'px';
    this.els.focus.style.transform = 'translate(' + mainFace.pointY +
      'px, ' + mainFace.pointX + 'px)';
  },

  clearFaceRings: function() {
    var paras = document.getElementsByClassName('focusring-yellow');
    if (paras.length === 0) { return; }
    while (paras.length) {
      paras[0].parentNode.removeChild(paras[0]);
    }
  }

});

});
