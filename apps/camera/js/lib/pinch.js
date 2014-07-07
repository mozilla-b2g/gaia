define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var unbind = require('lib/bind').unbind;
var bindAll = require('lib/bind-all');
var bind = require('lib/bind');
var events = require('evt');

/**
 * Mixin event emitter
 */

events(Pinch.prototype);

/**
 * Exports
 */

module.exports = Pinch;

/**
 * Initialize a new `Pinch` interface.
 *
 * @constructor
 */
function Pinch(el) {
  bindAll(this);
  this.attach(el);
}

Pinch.prototype.attach = function(el) {
  this.el = el;

  bind(this.el, 'touchstart', this.onTouchStart);
  bind(window, 'touchmove', this.onTouchMove);
  bind(window, 'touchend', this.onTouchEnd);
};

Pinch.prototype.detach = function() {
  unbind(this.el, 'touchstart', this.onTouchStart);
  unbind(window, 'touchmove', this.onTouchMove);
  unbind(window, 'touchend', this.onTouchEnd);

  this.el = null;
};

Pinch.prototype.onTouchStart = function(evt) {
  if (evt.touches.length !== 2) {
    return;
  }

  this.lastTouchA = evt.touches[0];
  this.lastTouchB = evt.touches[1];
  this.isPinching = true;
  this.emit('pinchstarted');
};

Pinch.prototype.onTouchMove = function(evt) {
  if (!this.isPinching) {
    return;
  }

  var touchA = getNewTouchA(this, evt.touches);
  var touchB = getNewTouchB(this, evt.touches);
  var deltaPinch = getDeltaPinch(this, touchA, touchB);

  this.emit('pinchchanged', deltaPinch);

  this.lastTouchA = touchA;
  this.lastTouchB = touchB;
};

Pinch.prototype.onTouchEnd = function(evt) {
  if (!this.isPinching) {
    return;
  }

  if (evt.touches.length < 2) {
    this.isPinching = false;
    this.emit('pinchended');
  }
};

function getNewTouchA(pinch, touches) {
  if (!pinch.lastTouchA) {
    return null;
  }

  for (var i = 0, length = touches.length, touch; i < length; i++) {
    touch = touches[i];
    if (touch.identifier === pinch.lastTouchA.identifier) {
      return touch;
    }
  }
  return null;
}

function getNewTouchB(pinch, touches) {
  if (!pinch.lastTouchB) {
    return null;
  }

  for (var i = 0, length = touches.length, touch; i < length; i++) {
    touch = touches[i];
    if (touch.identifier === pinch.lastTouchB.identifier) {
      return touch;
    }
  }
  return null;
}

function getDeltaPinch(pinch, touchA, touchB) {
  var lastTouchA = pinch.lastTouchA;
  var lastTouchB = pinch.lastTouchB;
  if (!touchA || !lastTouchA || !touchB || !lastTouchB) {
    return 0;
  }

  var oldDistance = Math.sqrt(
    Math.pow(lastTouchB.pageX - lastTouchA.pageX, 2) +
    Math.pow(lastTouchB.pageY - lastTouchA.pageY, 2));
  var newDistance = Math.sqrt(
    Math.pow(touchB.pageX - touchA.pageX, 2) +
    Math.pow(touchB.pageY - touchA.pageY, 2));
  return newDistance - oldDistance;
}

});
