define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var find = require('utils/find');
var View = require('vendor/view');
var attach = require('vendor/attach');
var formatTimer = require('utils/formattimer');
var debug = require('debug')('view:controls');

/**
 * Exports
 */

module.exports = View.extend({
  className: 'controls js-controls',
  buttonsDisabledClass: 'buttons-disabled',
  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.timer = find('.js-video-timer', this.el);
    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
  },

  template: function() {
    return '<a class="switch-button js-btn" name="switch">' +
      '<span class="rotates"></span>' +
    '</a>' +
    '<a class="capture-button js-btn" name="capture">' +
      '<span class="rotates"></span>' +
    '</a>' +
    '<div class="misc-button">' +
      '<a class="gallery-button js-btn" name="gallery">' +
        '<span class="rotates"></span>' +
      '</a>' +
      '<a class="cancel-pick js-btn" name="cancel">' +
        '<span></span>' +
      '</a>' +
      '<span class="video-timer js-video-timer">00:00</span>' +
    '</div>';
  },

  set: function(key, value) {
    this.el.setAttribute('data-' + key, value);
  },

  enableButtons: function() {
    this.el.classList.remove(this.buttonsDisabledClass);
    debug('buttons enabled');
  },

  disableButtons: function() {
    this.el.classList.add(this.buttonsDisabledClass);
    debug('buttons disabled');
  },

  setVideoTimer: function(ms) {
    var formatted = formatTimer(ms);
    this.els.timer.textContent = formatted;
  },

  onButtonClick: function(e, el) {
    e.stopPropagation();
    var name = el.getAttribute('name');
    this.emit('click:' + name, e);
  }
});

});
