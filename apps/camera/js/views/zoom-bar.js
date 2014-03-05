define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var bind = require('lib/bind');
var constants = require('config/camera');
var orientation = require('lib/orientation');

/**
 * Locals
 */

var lastTouch = null;

var clamp = function(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
};

module.exports = View.extend({
  name: 'zoom-bar',

  initialize: function() {
    this.render();

    this._orientation = orientation.get();

    // Bind events
    bind(this.el, 'touchstart', this.onTouchStart);
    bind(this.el, 'touchmove', this.onTouchMove);
    bind(this.el, 'touchend', this.onTouchEnd);
    orientation.on('orientation', this.setOrientation);
  },

  render: function() {
    this.el.innerHTML = this.template();

    // Find elements
    this.els.inner = this.find('.zoom-bar-inner');
    this.els.handle = this.find('.zoom-bar-handle');
  },

  template: function() {
    return '<div class="zoom-bar-inner">' +
        '<div class="zoom-bar-handle"></div>' +
      '</div>';
  },

  onTouchStart: function(evt) {
    lastTouch = evt.touches[0];
    this._innerHeight = this.els.inner.offsetHeight;

    evt.stopPropagation();
  },

  onTouchMove: function(evt) {
    if (!lastTouch) {
      return;
    }

    var touch = evt.touches[0];
    var delta = {
      x: lastTouch.pageX - touch.pageX,
      y: lastTouch.pageY - touch.pageY
    };

    var scale = 100 / this._innerHeight;
    
    delta.x *= scale;
    delta.y *= scale;

    switch (this._orientation) {
      case 0:
        this.setValue(this._value + delta.y, true);
        break;
      case 90:
        this.setValue(this._value + delta.x, true);
        break;
      case 180:
        this.setValue(this._value - delta.y, true);
        break;
      case 270:
        this.setValue(this._value - delta.x, true);
        break;
      default:
        break;
    }

    this.emit('change', this._value);

    lastTouch = touch;
  },

  onTouchEnd: function(evt) {
    if (!lastTouch) {
      return;
    }

    lastTouch = null;
  },

  _orientation: 0,

  setOrientation: function(orientation) {
    this._orientation = orientation;
  },

  _value: 0,

  setValue: function(value) {
    var lastValue = this._value;

    this._value = clamp(value, 0, 100);

    if (this._value === lastValue) {
      return;
    }

    this.els.inner.style.background = 'linear-gradient(to top, ' +
      'rgba(255,255,255,1) ' + this._value + '%, ' +
      'rgba(113,145,155,0.75) ' + this._value + '%)';

    this.els.handle.style.bottom = this._value + '%';

    this.el.classList.add('zooming');

    var self = this;
    this._inactivityTimeout = window.setTimeout(function() {
      self.el.classList.remove('zooming');
      self._inactivityTimeout = null;
    }, constants.ZOOM_BAR_INACTIVITY_TIMEOUT);
  }
});

});
