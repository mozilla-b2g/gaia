define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var attach = require('vendor/attach');
var View = require('vendor/view');
var bind = require('utils/bind');
var find = require('utils/find');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'hud',
  buttonsDisabledClass: 'buttons-disabled',

  initialize: function(options) {
    this.model = options.model;
    this.model.on('change:supports', this.onSupportChange);
    this.model.on('change:flashMode', this.setFlashMode);
    this.model.on('change:selectedCamera', this.setter('selectedCamera'));
    this.configure();
    this.render();
  },

  configure: function() {
    this.set('flashMode', this.model.get('flashMode'));
    this.set('selectedCamera', this.model.get('selectedCamera'));
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.flash = find('.js-toggle-flash-mode', this.el);
    this.els.flashModeName = find('.js-flash-mode-name', this.el);
    this.els.camera = find('.js-toggle-selected-camera', this.el);
    bind(this.els.flash, 'click', this.onFlashClick, this);
    bind(this.els.camera, 'click', this.onCameraClick, this);
  },

  setFlashMode: function(mode) {
    this.set('flash-mode', mode);
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
    var model = this.model;

    classes.add(toggleClass);
    clearTimeout(this.toggleTimer);
    this.toggleTimer = setTimeout(function() {
      classes.remove(toggleClass);
      model.toggle('flashMode');
    }, 1000);
  },

  onCameraClick: function() {
    this.model.toggle('selectedCamera');
  },

  onSupportChange: function() {

  },

  toggleDisableButtons: function(value) {
    this.el.classList.toggle(this.buttonsDisabledClass, value);
  },

  disableButtons: function() {
    this.el.classList.add(this.buttonsDisabledClass);
    return this;
  },

  set: function(key, value) {
    value = arguments.length === 2 ? value : true;
    this.el.setAttribute(toDash(key), value);
  },

  setter: function(key) {
    return (function(value) { this.set(key, value); }).bind(this);
  },

  enable: function(key, value) {
    value = arguments.length === 2 ? value : true;
    this.set(key + '-enabled', value);
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

  template: function() {
    return '<a class="toggle-flash rotates js-toggle-flash-mode">' +
      '<div class="flash-text">' +
        'Flash: <span class="flash-name js-flash-mode-name"></span>' +
      '</div>' +
    '</a>' +
    '<a class="toggle-camera rotates js-toggle-selected-camera"></a>';
  }
});

function toDash(s) {
  return s.replace(/\W+/g, '-')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

});
