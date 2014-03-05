define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var bind = require('lib/bind');
var find = require('lib/find');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'hud',
  buttonsDisabledClass: 'buttons-disabled',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.flash = find('.js-flash', this.el);
    this.els.flashModeName = find('.js-flash-name', this.el);
    this.els.camera = find('.js-camera', this.el);
    this.els.settings = find('.js-settings', this.el);
    bind(this.els.flash, 'click', this.onFlashClick);
    bind(this.els.camera, 'click', this.onCameraClick);
    bind(this.els.settings, 'click', this.onSettingsClick, true);
  },

  setFlashMode: function(mode) {
    if (!mode) { return; }
    var classes = this.els.flash.classList;
    var oldIcon = this.flashMode && this.flashMode.icon;
    this.els.flashModeName.textContent = mode.title;
    if (oldIcon) { classes.remove(oldIcon); }
    classes.add(mode.icon);
    this.flashMode = mode;
  },

  /**
   * Add the toggle state class,
   * then remove it after 1 second
   * of inactivity.
   *
   * We use this class to
   * show the flash name text.
   *
   */
  onFlashClick: function(e) {
    var self = this;
    this.emit('click:flash');
    this.set('toggling-flash', true);
    clearTimeout(this.toggleTimer);
    this.toggleTimer = setTimeout(function() {
      self.set('toggling-flash', false);
    }, 1000);
  },

  onCameraClick: function(event) {
    this.emit('click:camera');
  },

  onSettingsClick: function(event) {
    event.stopPropagation();
    this.emit('click:settings');
  },

  template: function() {
    return '<div class="hud_btn hud_camera rotates icon-toggle-camera ' +
    'test-toggle-camera js-camera"></div>' +
    '<div class="hud_btn hud_flash rotates test-toggle-flash js-flash">' +
      '<div class="hud_flash-text test-flash-text">' +
        'Flash: <span class="flash-name js-flash-name"></span>' +
      '</div>' +
    '</div>' +
    '<div class="hud_btn hud_settings rotates icon-settings js-settings">' +
    '</div>';
  }
});

});
