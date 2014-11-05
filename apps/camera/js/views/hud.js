define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:hud');
var bind = require('lib/bind');
var View = require('view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'hud',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.flash = this.find('.js-flash');
    this.els.camera = this.find('.js-camera');
    this.els.settings = this.find('.js-settings');

    // Clean up
    delete this.template;

    debug('rendered');
    return this.bindEvents();
  },

  bindEvents: function() {
    bind(this.els.flash, 'click', this.onFlashClick);
    bind(this.els.camera, 'click', this.onCameraClick);
    bind(this.els.settings, 'click', this.onSettingsClick, true);
    return this;
  },

  setFlashMode: function(mode) {
    if (!mode) { return; }
    this.els.flash.dataset.icon = mode.icon;
  },

  setCamera: function(camera) {
    if (!camera) { return; }
    this.els.camera.dataset.icon = camera.icon;
  },

  onFlashClick: function(event) {
    event.stopPropagation();
    this.emit('click:flash');
  },

  onCameraClick: function(event) {
    event.stopPropagation();
    this.emit('click:camera');
  },

  onSettingsClick: function(event) {
    event.stopPropagation();
    this.emit('click:settings');
  },

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="hud_btn hud_camera rotates test-camera-toggle js-camera"></div>' +
    '<div class="hud_btn hud_flash rotates test-flash-button js-flash"></div>' +
    '<div class="hud_btn hud_settings rotates test-settings-toggle js-settings" data-icon="menu">' +
    '</div>';
  }
});

});
