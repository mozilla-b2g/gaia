define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

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
    bind(this.els.flash, 'click', this.onFlashClick);
    bind(this.els.camera, 'click', this.onCameraClick);
    bind(this.els.settings, 'click', this.onSettingsClick, true);
  },

  setFlashMode: function(mode) {
    if (!mode) {
      return;
    }

    var classes = this.els.flash.classList;
    var oldIcon = this.flashMode && this.flashMode.icon;
    if (oldIcon) {
      classes.remove(oldIcon);
    }

    classes.add(mode.icon);
    this.flashMode = mode;
  },

  setCamera: function(camera) {
    if (!camera) {
      return;
    }

    var classes = this.els.camera.classList;
    var oldIcon = this.camera && this.camera.icon;
    if (oldIcon) {
      classes.remove(oldIcon);
    }

    classes.add(camera.icon);
    this.camera = camera;
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
    '<div class="hud_btn hud_settings rotates icon-settings test-settings-toggle js-settings">' +
    '</div>';
  }
});

});
