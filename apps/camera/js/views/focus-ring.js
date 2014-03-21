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
    this.els.focus.dataset.state = 'none';
  },
  render: function() {
    this.el.innerHTML = this.template();
    this.el.dataset.mode = 'normal';
    this.els.focus = find('.js-focus', this.el);
  },

  setState: function(state) {
    this.els.focus.dataset.state = state;
  },

  changePosition: function(x, y) {
    this.setDefaultValues();
    this.el.dataset.mode = 'touch';
    this.els.focus.style.left = x + 'px';
    this.els.focus.style.top = y + 'px';
  },

  setDefaultValues: function() {
    this.els.focus.style.transform = 'translate(0px, 0px)';
    this.els.focus.style.fontSize = '92px';
  },

  tranformRing: function(px, py, size, id) {
    var focusElm = this.getFocusRing(id);
    focusElm.style.fontSize = size + 'px';
    focusElm.style.transform = 'translate(' + py + 'px, ' + px + 'px)';
  },

  template: function() {
    return '<div class="focusring icon-focus-locking js-focus"></div>';
  },

  getFocusRing: function(id) {
    var focusRing = document.createElement('div');
    focusRing.id = 'focus-ring-' + id;
    focusRing.classList.add('focusring');
    focusRing.classList.add('icon-focus-locking');
    focusRing.classList.add('face-ring');
    focusRing.dataset.state = 'face';
    this.el.appendChild(focusRing);
    return focusRing;

  },

  setMaxID: function(mainFace) {
    var index = mainFace.index;
    this.els.face = find('#focus-ring-' + index, this.el);
    if (this.els.face) {
      this.els.face.removeChild(this.els.face);
    }
    this.el.dataset.mode = 'face';
    this.setDefaultValues();
    this.els.focus.style.fontSize = mainFace.length + 'px';
    this.els.focus.style.transform = 'translate(' + mainFace.pointY +
      'px, ' + mainFace.pointX + 'px)';

  },

  clearFaceRings: function() {
    var paras = document.getElementsByClassName('face-ring');
    var i = 0;
    while (paras[i]) {
      paras[i].parentNode.removeChild(paras[i]);
      i++;
    }
  }

});

});
