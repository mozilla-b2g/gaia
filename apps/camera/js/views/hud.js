define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var bind = require('utils/bind');
var find = require('utils/find');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'hud',
  buttonsDisabledClass: 'buttons-disabled',

  initialize: function() {
    this.el.innerHTML = this.render();

    // Get elements
    this.els.flash = find('.js-toggle-flash', this.el);
    this.els.flashModeName = find('.js-flash-mode-name', this.el);
    this.els.camera = find('.js-toggle-camera', this.el);

    // Bind events
    bind(this.els.flash, 'click', this.onFlashClick, this);
    bind(this.els.camera, 'click', this.onCameraClick, this);
  },

  setFlashMode: function(mode) {
    mode = mode || 'none';
    this.els.flash.setAttribute('data-mode', mode);
    this.els.flashModeName.textContent = mode;
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
  onFlashClick: function() {
    var toggleClass = 'is-toggling';
    var classes = this.els.flash.classList;

    classes.add(toggleClass);
    clearTimeout(this.toggleTimer);

    this.toggleTimer = setTimeout(function() {
      classes.remove(toggleClass);
    }, 1000);

    this.emit('flashToggle');
  },

  onCameraClick: function() {
    this.emit('cameraToggle');
  },

  toggleDisableButtons: function(value) {
    this.el.classList.toggle(this.buttonsDisabledClass, value);
  },

  disableButtons: function() {
    this.el.classList.add(this.buttonsDisabledClass);
    return this;
  },

  enableButtons: function() {
    this.el.classList.remove(this.buttonsDisabledClass);
    return this;
  },

  showCameraToggleButton: function(hasFrontCamera) {
    this.el.classList.toggle('has-front-camera', hasFrontCamera);
  },

  highlightCameraButton: function(value) {
    this.el.classList.toggle('is-toggling-camera', value);
  },

  render: function() {
    return '<a class="toggle-flash rotates js-toggle-flash">' +
      '<div class="flash-text">' +
        'Flash: <span class="flash-name js-flash-mode-name"></span>' +
      '</div>' +
    '</a>' +
    '<a class="toggle-camera rotates js-toggle-camera"></a>';
  }
});

});
