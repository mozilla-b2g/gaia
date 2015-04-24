// this module is responsible for the touch/panning of MultiDay views
define(function(require, exports, module) {
'use strict';

var EventEmitter2 = require('ext/eventemitter2');
var clamp = require('utils/mout').clamp;
var lerp = require('utils/mout').lerp;
var norm = require('utils/mout').norm;

function Pan(options) {
  EventEmitter2.call(this);

  this.eventTarget = options.eventTarget;
  this.targets = options.targets;
  this.overflows = options.overflows || [];

  this._gridSize = Math.max(options.gridSize || 0, 1);
  this._visibleCells = Math.max(options.visibleCells || 0, 1);
  this._startMouseX = this._startMouseY = 0;
  this._isVertical = false;
  this._startTime = 0;
  this._touchStart = 0;
  this._dx = 0;

  // _lockedAxis is used to control if we detected if the movement is
  // vertical/horizontal, very important for ignoring clicks and also to be
  // able to set a threshold for the axis detection
  this._lockedAxis = false;

  this._onTouchStart = this._onTouchStart.bind(this);
  this._onTouchMove = this._onTouchMove.bind(this);
  this._onTouchEnd = this._onTouchEnd.bind(this);
  this._tick = this._tick.bind(this);
  this._setBaseValues = this._setBaseValues.bind(this);
  this._onTweenEnd = null;
}
module.exports = Pan;

Pan.prototype = {
  __proto__: EventEmitter2.prototype,

  TRANSITION_DURATION: 800,

  setup: function() {
    var element = this.eventTarget;
    element.addEventListener('touchstart', this._onTouchStart);
    element.addEventListener('touchmove', this._onTouchMove);
    element.addEventListener('touchend', this._onTouchEnd);
    element.addEventListener('touchcancel', this._onTouchEnd);
    window.addEventListener('localized', this._setBaseValues);
    this._setBaseValues();
  },

  _setBaseValues: function() {
    var delta = this._gridSize * this._visibleCells;

    if (document.documentElement.dir === 'rtl') {
      this._dir = -1;
      this._minX = 0;
      this._maxX = delta * 2;
    } else {
      this._dir = 1;
      this._minX = delta * -2;
      this._maxX = 0;
    }

    this._origX = this._startX = this._curX = this._destX = delta * -this._dir;
    this._set(this._origX);
  },

  _onTouchStart: function(evt) {
    this._startMouseX = evt.touches[0].clientX;
    this._startMouseY = evt.touches[0].clientY;
    this._isVertical = false;
    this._lockedAxis = false;
    this._touchStart = Date.now();
    // we need to reset the tween callback because we should only call it
    // once and only if user did not trigger a new touch
    this._onTweenEnd = null;
  },

  _onTouchMove: function(evt) {
    if (this._isVertical) {
      return;
    }

    var dx = this._startMouseX - evt.touches[0].clientX;
    var dy = this._startMouseY - evt.touches[0].clientY;
    this._dx = dx;

    if (!this._lockedAxis) {
      var adx = Math.abs(dx);
      var ady = Math.abs(dy);

      // we wait until we are sure movement is horizontal before we do anything.
      // if absolute difference between x/y movement is over a threshold (10px)
      // we assume drag follows a single axis.
      if (Math.abs(adx - ady) < 10) {
        return;
      }

      this._isVertical = adx < ady;
      this._lockedAxis = true;

      this.emit('start');

      if (this._isVertical) {
        return;
      }

      // we should only lock scroll once and only if dragging horizontally
      this._lockScroll();
    }

    this._updateDestination(this._origX - dx, 0);
  },

  _lockScroll: function() {
    this.overflows.forEach(el => el.style.overflowY = 'hidden');
  },

  _unlockScroll: function() {
    this.overflows.forEach(el => el.style.overflowY = 'scroll');
  },

  _updateDestination: function(x, duration) {
    duration = duration != null ? duration : this.TRANSITION_DURATION;

    this._startX = this._curX;
    this._destX = clamp(x, this._minX, this._maxX);

    var now = Date.now();
    this._endTime = now + duration;

    if (!this._requestId) {
      this._startTime = now;
      this._tween();
    }
  },

  _tween: function() {
    this._requestId = window.requestAnimationFrame(this._tick);
  },

  _tick: function() {
    var t = norm(Date.now(), this._startTime, this._endTime);

    if (t >= 1 || this._curX === this._destX) {
      this._killTween();
      this._set(this._destX);
      return;
    }

    var x = lerp(ease(t), this._startX, this._destX);
    this._set(x);
    this._tween();
  },

  _killTween: function() {
    if (this._requestId) {
      window.cancelAnimationFrame(this._requestId);
      this._requestId = null;
    }
    this._onTweenEnd && this._onTweenEnd.call(this);
  },

  _onTouchEnd: function() {
    // if touch is very fast momentum would be bigger than our threshold,
    // this is very important for click events otherwise they wouldn't open
    // the event details
    if (this._isVertical || !this._lockedAxis) {
      this._unlockScroll();
      return;
    }

    var duration = Date.now() - this._touchStart;
    var momentum = Math.abs(this._dx) / duration;
    var snap;

    if (momentum > 0.5) {
      // if the drag was fast we consider it as a swipe (move multiple cells
      // at once)
      var direction = this._dx > 0 ? -1 : 1;
      snap = this._origX + (direction * this._gridSize * this._visibleCells);
    } else {
      // we only round up if very close to the next column, this behavior is
      // better for the user than a regular round/ceil/floor
      snap = Math.round((this._destX / this._gridSize) + 0.2) *
        this._gridSize;
    }

    // we only unlock the scroll after the tween is complete to make multiple
    // consecutive swipes faster (also avoids flickering y-axis position)
    this._onTweenEnd = this._unlockScroll;
    this._updateDestination(snap);

    this.emit('release', {
      diff: Math.round((this._origX - this._destX) / this._gridSize) * this._dir
    });
  },

  _set: function(x) {
    x = clamp(x, this._minX, this._maxX);
    this.targets.forEach(el => {
      el.style.transform = 'translateX(' + x +'px)';
    });
    this._curX = x;
  },

  refresh: function() {
    var diff = Math.abs(this._curX - this._destX);
    diff *= this._curX < this._destX ? -1 : 1;

    // we update the position based on the relative distance to keep a smooth
    // transition
    if (diff) {
      this._set(this._origX + diff);
      this._updateDestination(this._origX);
    } else {
      this._set(this._origX);
    }
  }

};

// borrowed from zeh/ztween (expoOut)
function ease(t) {
  return (t >= 0.999) ? 1 : 1.001 * (-Math.pow(2, -10 * t) + 1);
}

});
