define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var formatTimer = require('lib/format-timer');
var debug = require('debug')('view:controls');
var attach = require('vendor/attach');
var View = require('vendor/view');
var find = require('lib/find');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'controls',
  className: 'test-controls',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    attach.on(this.el, 'click', '.js-switch', this.onSwitchClick);
    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
    this.els.timer = find('.js-video-timer', this.el);
    debug('rendered');
  },

  set: function(key, value) {
    this.el.setAttribute(key, value);
  },

  setter: function(key) {
    return (function(value) { this.set(key, value); }).bind(this);
  },

  enable: function(key, value) {
    value = arguments.length === 2 ? value : true;
    this.set(key + '-enabled', value);
  },

  enabler: function(key) {
    return (function(value) { this.enable(key, value); }).bind(this);
  },

  disable: function(key) {
    this.enable(key, false);
  },

  setVideoTimer: function(ms) {
    var formatted = formatTimer(ms);
    this.els.timer.textContent = formatted;
  },

  onButtonClick: function(e, el) {
    e.stopPropagation();
    var name = el.getAttribute('name');
    this.emit('click:' + name, e);
  },

  template: function() {
    return '<a class="switch-button test-switch js-btn" name="switch">' +
      '<span class="icon rotates"></span>' +
    '</a>' +
    '<a class="capture-button test-capture js-btn" name="capture">' +
      '<span class="icon rotates"></span>' +
    '</a>' +
    '<div class="misc-button">' +
      '<a class="gallery-button test-gallery js-btn" name="gallery">' +
        '<span class="icon-gallery rotates"></span>' +
      '</a>' +
      '<a class="cancel-pick test-cancel-pick js-btn" name="cancel">' +
        '<span></span>' +
      '</a>' +
      '<span class="video-timer test-video-timer js-video-timer">00:00</span>' +
    '</div>';
  },
});

});
