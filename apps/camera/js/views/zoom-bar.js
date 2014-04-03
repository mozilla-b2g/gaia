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
    bind(this.els.scrubber, 'touchstart', this.onTouchStart);
    bind(this.els.scrubber, 'touchmove', this.onTouchMove);
    bind(this.els.scrubber, 'touchend', this.onTouchEnd);
    bind(this.els.maxIndicator, 'click', this.onIncrement);
    bind(this.els.minIndicator, 'click', this.onDecrement);
    orientation.on('orientation', this.setOrientation);
  },

  render: function() {
    this.el.innerHTML = this.template();

    // Find elements
    this.els.maxIndicator = this.find('.zoom-bar-max-indicator');
    this.els.minIndicator = this.find('.zoom-bar-min-indicator');
    this.els.inner = this.find('.zoom-bar-inner');
    this.els.track = this.find('.zoom-bar-track');
    this.els.scrubber = this.find('.zoom-bar-scrubber');
  },

  template: function() {
    return '<div class="zoom-bar-max-indicator"></div>' +
      '<div class="zoom-bar-inner">' +
        '<div class="zoom-bar-track"></div>' +
        '<div class="zoom-bar-scrubber"></div>' +
      '</div>' +
      '<div class="zoom-bar-min-indicator"></div>';
  },

  onTouchStart: function(evt) {
    lastTouch = evt.touches[0];
    this.resetInactivityTimeout();
    this.setScrubberActive(true);
    this._innerHeight = this.els.inner.offsetHeight;

    evt.stopPropagation();
  },

  onTouchMove: function(evt) {
    if (!lastTouch) {
      return;
    }

    var touch = evt.touches[0];
    var deltaX = lastTouch.pageX - touch.pageX;
    var deltaY = lastTouch.pageY - touch.pageY;

    var scale = 100 / this._innerHeight;
    
    deltaX *= scale;
    deltaY *= scale;

    switch (this._orientation) {
      case 0:
        this.setValue(this._value + deltaY, true);
        break;
      case 90:
        this.setValue(this._value + deltaX, true);
        break;
      case 180:
        this.setValue(this._value - deltaY, true);
        break;
      case 270:
        this.setValue(this._value - deltaX, true);
        break;
    }

    lastTouch = touch;
  },

  onTouchEnd: function(evt) {
    if (!lastTouch) {
      return;
    }

    lastTouch = null;
    this.resetInactivityTimeout();
    this.setScrubberActive(false);
  },

  onIncrement: function(evt) {
    this.setValue(this._value + constants.ZOOM_BAR_INDICATOR_INTERVAL, true);
    this.flashScrubberActive();
    evt.stopPropagation();
  },

  onDecrement: function(evt) {
    this.setValue(this._value - constants.ZOOM_BAR_INDICATOR_INTERVAL, true);
    this.flashScrubberActive();
    evt.stopPropagation();
  },

  _orientation: 0,

  setOrientation: function(orientation) {
    var el = this.el;
    el.classList.remove('zooming');

    // Force ZoomBar to hide *immediately* on orientation change
    el.style.transitionDuration = '0ms';
    window.requestAnimationFrame(function() {
      el.style.transitionDuration = '';
    });

    this._orientation = orientation;
  },

  _value: 0,

  setValue: function(value, emitChange) {
    this.resetInactivityTimeout();

    var lastValue = this._value;
    this._value = clamp(value, 0, 100);
    if (this._value === lastValue) {
      return;
    }

    if (this._value === 0) {
      this.els.minIndicator.classList.add('active');
    } else {
      this.els.minIndicator.classList.remove('active');
    }

    if (this._value === 100) {
      this.els.maxIndicator.classList.add('active');
    } else {
      this.els.maxIndicator.classList.remove('active');
    }

    var self = this;
    window.requestAnimationFrame(function() {
      self.els.track.style.top = (100 - self._value) + '%';
      self.els.scrubber.style.bottom = self._value + '%';
    });

    if (emitChange) {
      this.emit('change', this._value);
    }
  },

  setScrubberActive: function(active) {
    window.clearTimeout(this._scrubberTimeout);

    if (active) {
      this.els.scrubber.classList.add('active');
    } else {
      this.els.scrubber.classList.remove('active');
    }
  },

  flashScrubberActive: function() {
    this.setScrubberActive(true);
    var self = this;
    this._scrubberTimeout = window.setTimeout(function() {
      self.setScrubberActive(false);
    }, 150);
  },

  resetInactivityTimeout: function() {
    window.clearTimeout(this._inactivityTimeout);

    this.el.classList.add('zooming');

    var self = this;
    this._inactivityTimeout = window.setTimeout(function() {
      self.el.classList.remove('zooming');
    }, constants.ZOOM_BAR_INACTIVITY_TIMEOUT);
  }
});

});
