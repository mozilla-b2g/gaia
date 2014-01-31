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

  initialize: function() {
    this.render();
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
    var self = this;
    this.emit('click:flash');
    this.set('toggling-flash', true);
    clearTimeout(this.toggleTimer);
    this.toggleTimer = setTimeout(function() {
      self.set('toggling-flash', false);
    }, 1000);
  },

  onCameraClick: function() {
    this.emit('click:camera');
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
    this.set(key + '-enabled', !!value);
  },

  disable: function(key) {
    this.enable(key, false);
  },

  hide: function(key, value) {
    this.set(key + '-hidden', value);
  },

  template: function() {
    return '<a class="toggle-flash rotates test-toggle-flash js-toggle-flash-mode">' +
      '<div class="flash-text test-flash-text">' +
        'Flash: <span class="flash-name js-flash-mode-name"></span>' +
      '</div>' +
    '</a>' +
    '<a class="toggle-camera rotates test-toggle-camera js-toggle-selected-camera"></a>';
  }
});

function toDash(s) {
  return s.replace(/\W+/g, '-')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

});
