(function(define){'use strict';define(function(require,exports,module){
/*globals define*//*jshint node:true*/

/**
 * Dependencies
 */

var events = require('evt');

/**
 * Exports
 */

module.exports = Drag;

/**
 * Mixin Emitter
 */

events(Drag.prototype);

/**
 * Drag creates a draggable 'handle' element,
 * constrained within a 'container' element.
 *
 * Drag instances emit useful events and provides
 * methods to support common draggable UI use-cases,
 * like `snapToClosestEdge`
 *
 * In Gaia we use `Drag` for our switch components.
 *
 * Usage:
 *
 *   // Create a new `Drag`
 *   var drag = new Drag({
 *     container: myContainer,
 *     handle: myHandle
 *   });
 *
 *   // Once elements are in the DOM we
 *   // need to take some measurements
 *   drag.updateDimensions();
 *
 * Options:
 *
 *   - {Element} `container`
 *   - {Element} `handle`
 *
 * @param {Object} options
 */
function Drag(options) {
  this.container = { el: options.container };
  this.handle = { el: options.handle };
  this.onTouchStart = this.onTouchStart.bind(this);
  this.onTouchMove = this.onTouchMove.bind(this);
  this.onTouchEnd = this.onTouchEnd.bind(this);
  this.slideDuration = options.slideDuration || 140;
  this.tapTime = options.tapTime || 180;
  this.configureTransition();
  this.bindEvents();
}

Drag.prototype.bindEvents = function() {
  this.container.el.addEventListener('touchstart', this.onTouchStart);
  this.container.el.addEventListener('touchend', this.onTouchEnd);
  this.handle.el.addEventListener('touchmove', this.onTouchMove);
};

Drag.prototype.configureTransition = function() {
  this.handle.el.style.transitionTimingFunction = 'linear';
  this.handle.el.style.transitionProperty = 'transform';
  this.handle.el.style.willChange = 'transform';
};

Drag.prototype.onTouchStart = function(e) {
  this.touch = e.touches[0];
  this.firstTouch = this.touch;
  this.startTime = e.timeStamp;
};

Drag.prototype.onTouchMove = function(e) {
  var delta = {
    x: e.touches[0].clientX - this.touch.clientX,
    y: e.touches[0].clientY - this.touch.clientY
  };
  this.move(delta);
  this.touch = e.touches[0];
};

Drag.prototype.onTouchEnd = function(e) {
  var tapped = (e.timeStamp - this.startTime) < this.tapTime;
  if (tapped) { this.emit('tapped'); }
  else { this.emit('ended'); }
};

Drag.prototype.move = function(delta) {
  this.translate({
    x: this.handle.position.x + delta.x,
    y: this.handle.position.y + delta.y
  });
};

Drag.prototype.set = function(pos) {
  if (!this.edges) { return; }
  var x = typeof pos.x === 'string' ? this.edges[pos.x] : (pos.x || 0);
  var y = typeof pos.y === 'string' ? this.edges[pos.y] : (pos.y || 0);
  this.translate({ x: x, y: y });
};

Drag.prototype.snapToClosestEdge = function() {
  var edges = this.getClosestEdges();

  this.translate({
    x: this.edges[edges.x],
    y: this.edges[edges.y]
  });

  this.emit('snapped', edges);
};

Drag.prototype.translate = function(position) {
  position = this.clamp(position);

  var translate = 'translate(' + position.x + 'px,' + position.y + 'px)';
  var duration = this.transitionDuration(position);
  var ratio = {
    x: (position.x / this.max.x) || 0,
    y: (position.y / this.max.y) || 0
  };

  // If there is a duration, set it
  this.handle.el.style.transitionDuration = duration ? duration + 'ms' : '';

  // Set the transform to move the handle
  this.handle.el.style.transform = translate;

  // Update the handle position reference
  this.handle.position = position;

  // Emit event with useful data
  this.emit('translate', {
    duration: duration,
    position: {
      px: position,
      ratio: ratio
    }
  });
};

Drag.prototype.clamp = function(position) {
  return {
    x: Math.max(this.min.x, Math.min(this.max.x, position.x)),
    y: Math.max(this.min.y, Math.min(this.max.y, position.y)),
  };
};

Drag.prototype.transitionDuration = function(position) {
  var current = this.handle.position;
  var distanceX = Math.abs(current.x - position.x);
  var distanceY = Math.abs(current.y - position.y);
  var distance = Math.max(distanceX, distanceY);
  var axis = distanceY > distanceX ? 'y' : 'x';
  var ratio = distance / this.max[axis];
  return this.slideDuration * ratio;
};

Drag.prototype.getClosestEdges = function() {
  return {
    x: this.handle.position.x <= (this.max.x / 2) ?  'left' : 'right',
    y: this.handle.position.y <= (this.max.y / 2) ?  'top' : 'bottom'
  };
};

Drag.prototype.updateDimensions = function() {
  var container = this.container.el.getBoundingClientRect();
  var handle = this.handle.el.getBoundingClientRect();

  this.min = { x: 0, y: 0 };
  this.max = {
    x: container.width - handle.width,
    y: container.height - handle.height
  };

  this.edges = {
    top: this.min.y,
    right: this.max.x,
    bottom: this.max.y,
    left: this.min.x
  };

  this.handle.position = {
    x: handle.left - container.left,
    y: handle.top - container.top
  };
};

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('drag',this));