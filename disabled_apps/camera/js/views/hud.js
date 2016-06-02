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

  _setLabel: function(element, mode) {
    if (mode) {
      this.els[element].setAttribute('data-l10n-id', mode.title + '-button');
    } else {
      this.els[element].removeAttribute('data-l10n-id');
      this.els[element].removeAttribute('aria-label');
    }
  },

  setFlashModeLabel: function(mode) {
    this._setLabel('flash', mode);
  },

  setFlashMode: function(mode) {
    if (!mode) { return; }
    this.els.flash.dataset.icon = mode.icon;
    this.setFlashModeLabel(mode);
  },

  setCameraLabel: function(camera) {
    this._setLabel('camera', camera);
  },

  setCamera: function(camera) {
    if (!camera) { return; }
    this.els.camera.dataset.icon = camera.icon;
    this.setCameraLabel(camera);
  },

  setMenuLabel: function() {
    this._setLabel('settings', { title: 'menu' });
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
    return '<div role="button" class="hud_btn hud_camera rotates ' +
      'test-camera-toggle js-camera"></div>' +
    '<div role="button" class="hud_btn hud_flash rotates test-flash-button ' +
      'js-flash"></div>' +
    '<div role="button" class="hud_btn hud_settings rotates ' +
      'test-settings-toggle js-settings" data-icon="menu" ' +
      'data-l10n-id="menu-button"></div>';
  }
});

});
