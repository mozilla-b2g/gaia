define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var bind = require('lib/bind');

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
    bind(this.els.flash, 'click', this.onFlashClick);
    bind(this.els.camera, 'click', this.onCameraClick);
    bind(this.els.settings, 'click', this.onSettingsClick, true);
  },

  setFlashMode: function(mode) {
    if (!mode) { return; }
    var classes = this.els.flash.classList;
    var oldIcon = this.flashMode && this.flashMode.icon;
    if (oldIcon) { classes.remove(oldIcon); }
    classes.add(mode.icon);
    this.flashMode = mode;
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
    return '<div class="hud_btn hud_camera rotates icon-toggle-camera ' +
    'test-toggle-camera js-camera"></div>' +
    '<div class="hud_btn hud_flash rotates test-toggle-flash js-flash"></div>' +
    '<div class="hud_btn hud_settings rotates icon-settings js-settings">' +
    '</div>';
  }
});

});
