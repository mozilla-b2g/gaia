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
  name: 'controls',
  buttonsDisabledClass: 'buttons-disabled',

  initialize: function(options) {
    this.model = options.model;
    this.model.on('change:mode', this.setter('mode'));
    this.model.on('change:recording', this.setter('recording'));
    this.set('mode', this.model.get('mode'));
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.timer = find('.js-video-timer', this.el);
    attach.on(this.el, 'click', '.js-switch', this.onSwitchClick);
    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
    return this;
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

  onSwitchClick: function(e) {
    this.model.toggle('mode');
  },

  template: function() {
    return '<a class="switch-button js-switch" name="switch">' +
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
});

});
