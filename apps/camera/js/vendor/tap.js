define(function(require, exports, module) {
  'use strict';

  /**
   * Exports
   */

  module.exports = Tap;

  /**
   * Locals
   */

  var TOUCH_MOVE_THRESHOLD = 10;

  function Tap(el) {
    this.el = el;

    el.addEventListener('click', this.onClick.bind(this), true);
    el.addEventListener('touchstart', this.onTouchStart.bind(this));
    el.addEventListener('touchmove', this.onTouchMove.bind(this));
    el.addEventListener('touchend', this.onTouchEnd.bind(this));
    el.addEventListener('touchcancel', this.cancelPendingClick.bind(this));

    this.cancelPendingClick();
  };

  Tap.prototype.onClick = function(evt) {
    if (!evt.isTap) {
      evt.stopImmediatePropagation();
      evt.preventDefault();
    }
  };

  Tap.prototype.onTouchStart = function(evt) {
    this.pendingClick = true;
    this.targetTouch = evt.targetTouches[0];

    this.touchStartX = this.targetTouch.pageX;
    this.touchStartY = this.targetTouch.pageY;
  };

  Tap.prototype.onTouchMove = function(evt) {
    var touch = evt.changedTouches[0];
    if (Math.abs(touch.pageX - this.touchStartX) > TOUCH_MOVE_THRESHOLD ||
        Math.abs(touch.pageY - this.touchStartY) > TOUCH_MOVE_THRESHOLD) {
      this.cancelPendingClick();
      return;
    }
  };

  Tap.prototype.onTouchEnd = function(evt) {
    if (!this.pendingClick) { return; }

    this.triggerClick(evt.target, evt.changedTouches[0]);

    evt.preventDefault();
  };

  Tap.prototype.cancelPendingClick = function() {
    if (!this.pendingClick) { return; }

    this.pendingClick = false;
    this.targetTouch = null;
  };

  Tap.prototype.triggerClick = function(target, touch) {
    var evt = document.createEvent('MouseEvents');
    evt.initMouseEvent('click', true, true, window, 1,
                       touch.screenX, touch.screenY,
                       touch.clientX, touch.clientY,
                       false, false, false, false, 0, null);
    evt.isTap = true;
    target.dispatchEvent(evt);
  };

  Tap.attach = function(el) {
    return new Tap(el);
  };

});
