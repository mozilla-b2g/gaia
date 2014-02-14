define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var bind = require('utils/bind');
var find = require('utils/find');
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

    // Find elements
    this.els.switchButton = find('.js-switch', this.el);
    this.els.captureButton = find('.js-capture', this.el);
    this.els.galleryButton = find('.js-gallery', this.el);
    this.els.cancelPickButton = find('.js-cancel-pick', this.el);
    this.els.timer = find('.js-video-timer', this.el);

    // Bind events
    bind(this.els.switchButton, 'click', this.onButtonClick);
    bind(this.els.captureButton, 'click', this.onButtonClick);
    bind(this.els.galleryButton, 'click', this.onButtonClick);
    bind(this.els.cancelPickButton, 'click', this.onButtonClick);
  },

  template: function() {
    return '<a class="switch-button js-switch" name="switch">' +
      '<span class="rotates"></span>' +
    '</a>' +
    '<a class="capture-button js-capture" name="capture">' +
      '<span class="rotates"></span>' +
    '</a>' +
    '<div class="misc-button">' +
      '<a class="gallery-button js-gallery" name="gallery">' +
        '<span class="rotates"></span>' +
      '</a>' +
      '<a class="cancel-pick js-cancel-pick" name="cancel">' +
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

  onButtonClick: function(event) {
    var el = event.currentTarget;
    var name = el.getAttribute('name');
    this.emit('click:' + name);
  }
});

});
