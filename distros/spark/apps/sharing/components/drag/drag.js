(function(define){'use strict';define(['require','exports','module'],function(require,exports,module){

/**
 * Pointer event abstraction to make
 * it work for touch and mouse.
 *
 * @type {Object}
 */
var pointer = [
  { down: 'touchstart', up: 'touchend', move: 'touchmove' },
  { down: 'mousedown', up: 'mouseup', move: 'mousemove' }
]['ontouchstart' in window ? 0 : 1];

/**
 * Simple logger
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : function() {};

/**
 * Exports
 */

module.exports = Drag;

/**
 * Drag creates a draggable 'handle' element,
 * constrained within a 'container' element.
 *
 * Drag instances dispatch useful events and provides
 * methods to support common draggable UI use-cases,
 * like snapping.
 *
 * In Gaia we use `Drag` for our switch components.
 *
 * Example:
 *
 *   var container = document.getElementById(#my-container);
 *   var handle = document.getElementById(#my-handle);
 *
 *   new Drag({
 *     container: {
 *       el: container,
 *       width: container.clientWidth,
 *       height: container.clientHeight
 *     },
 *     handle: {
 *       el: handle,
 *       width: handle.clientWidth,
 *       height: handle.clientHeight,
 *       x: 0,
 *       y: 0
 *     }
 *   });
 *
 * @param {Object} config
 */
function Drag(config) {
  debug('init', config);
  this.config(config);
  this.dragging = false;
  this.setupEvents();
}

/**
 * Update the configuration.
 *
 * @param  {Object} config
 */
Drag.prototype.config = function(config) {
  this.slideDuration = config.slideDuration || 140;
  this.container = config.container;
  this.handle = config.handle;
  this.max = {
    x: this.container.width - this.handle.width,
    y: this.container.height - this.handle.height
  };
};

/**
 * Preserve context and bind initial
 * 'down' event listener.
 *
 * @private
 */
Drag.prototype.setupEvents = function() {
  debug('setup events', pointer);
  this.onPointerStart = this.onPointerStart.bind(this);
  this.onPointerMove = this.onPointerMove.bind(this);
  this.onPointerEnd = this.onPointerEnd.bind(this);
  this.handle.el.addEventListener(pointer.down, this.onPointerStart);
};

/**
 * Adds events listeners and updates
 * the `dragging` flag.
 *
 * @param  {Event} e
 * @private
 */
Drag.prototype.onPointerStart = function(e) {
  debug('pointer start', e);
  this.point = getPoint(e);
  addEventListener(pointer.move, this.onPointerMove);
  addEventListener(pointer.up, this.onPointerEnd);
  clearTimeout(this.timeout);
  this.timeout = setTimeout(() => this.dragging = true, 200);
};

/**
 * Removes events listeners and updates
 * the `dragging` flag.
 *
 * @param  {Event} e
 * @private
 */
Drag.prototype.onPointerEnd = function(e) {
  debug('pointer end', e);
  clearTimeout(this.timeout);
  this.timeout = setTimeout(() => this.dragging = false);
  removeEventListener(pointer.move, this.onPointerMove);
  removeEventListener(pointer.up, this.onPointerEnd);
  this.dispatch('ended', e);
};

/**
 * Moves the handle when the pointer moves.
 *
 * @param  {Event} e
 * @private
 */
Drag.prototype.onPointerMove = function(e) {
  debug('pointer move', e);
  e.preventDefault();
  var previous = this.point;
  this.point = getPoint(e);
  this.setDuration(0);
  this.translateDelta(
    this.point.pageX - previous.pageX,
    this.point.pageY - previous.pageY
  );
};

/**
 * Translate the handle by given delta.
 *
 * @param  {Number} deltaX
 * @param  {Number} deltaY
 * @public
 */
Drag.prototype.translateDelta = function(deltaX, deltaY) {
  debug('translate by', deltaX, deltaY);
  this.translate(
    this.handle.x + deltaX,
    this.handle.y + deltaY
  );
};

/**
 * Translate the handle to given coordinates.
 *
 * Numbers are interpreted as pixels and
 * Strings as ratio/percentage.
 *
 * Example:
 *
 *   drag.translate(50, 0); // translate(50px, 0px);
 *   drag.translate('0.5', 0); // translate(<halfway>, 0px);
 *
 * @param  {Number|String} x
 * @param  {Number|String} y
 * @public
 */
Drag.prototype.translate = function(x, y) {
  debug('translate', x, y);
  var position = this.clamp(this.normalize(x, y));
  var translate = 'translate(' + position.x + 'px,' + position.y + 'px)';
  var ratio = {
    x: (position.x / this.max.x) || 0,
    y: (position.y / this.max.y) || 0
  };

  // Set the transform to move the handle
  this.handle.el.style.transform = translate;

  // Update the handle position reference
  this.handle.x = position.x;
  this.handle.y = position.y;

  // dispatch event with useful data
  this.dispatch('translate', this.handle);
};

/**
 * Transition the handle to given coordinates.
 *
 * Example:
 *
 *   drag.transition(50, 0); // 50px, 0px;
 *   drag.transition('0.5', 0); // <halfway>, 0px
 *
 * @param  {Number|String} x
 * @param  {Number|String} y
 * @public
 */
Drag.prototype.transition = function(x, y) {
  debug('transition', x, y);
  var pos = this.clamp(this.normalize(x, y));
  var duration = this.getDuration(this.handle, pos);
  this.setDuration(duration);
  this.translate(pos.x, pos.y);
};

/**
 * Normalize x/y parametes to pixel values.
 *
 * Strings are interpreted as a ratio of
 * max x/y position.
 *
 * @param  {Number|String} x
 * @param  {Number|String} y
 * @return {Object} {x,y}
 * @private
 */
Drag.prototype.normalize = function(x, y) {
  return {
    x: typeof x == 'string' ? (Number(x) * this.max.x) : x,
    y: typeof y == 'string' ? (Number(y) * this.max.y) : y
  }
};

/**
 * Snap the handle to nearest edge(s).
 *
 * @public
 */
Drag.prototype.snap = function() {
  debug('snap');
  var edges = this.getClosestEdges();
  this.transition(edges.x, edges.y)
  this.dispatch('snapped', edges);
};

/**
 * Clamp coordinates between the
 * allowed min/max values.
 *
 * @param  {Object} pos {x,y}
 * @return {Object} {x,y}
 */
Drag.prototype.clamp = function(pos) {
  return {
    x: Math.max(0, Math.min(this.max.x, pos.x)),
    y: Math.max(0, Math.min(this.max.y, pos.y)),
  };
};

/**
 * Get the ideal transition duration based
 * on how much distance has to be tranvelled.
 *
 * When snapping, we don't want to use the same
 * duration for short distances as long.
 *
 * @param  {Object} from {x,y}
 * @param  {Object} to   {x,y}
 * @return {Number}
 */
Drag.prototype.getDuration = function(from, to) {
  var distanceX = Math.abs(from.x - to.x);
  var distanceY = Math.abs(from.y - to.y);
  var distance = Math.max(distanceX, distanceY);
  var axis = distanceY > distanceX ? 'y' : 'x';
  var ratio = distance / this.max[axis];
  return this.slideDuration * ratio;
};

/**
 * Set the handle's transition duration.
 *
 * @param {Number} ms
 */
Drag.prototype.setDuration = function(ms) {
  this.handle.el.style.transitionDuration = ms + 'ms';
}

/**
 * Get the closest x and y edges.
 *
 * The strings returns represent
 * ratio/percentage of axis' overall range.
 *
 * @return {Object} {x,y}
 */
Drag.prototype.getClosestEdges = function() {
  return {
    x: this.handle.x <= (this.max.x / 2) ?  '0' : '1',
    y: this.handle.y <= (this.max.y / 2) ?  '0' : '1'
  };
};

/**
 * Dispatch a DOM event on the container
 * element. All events are namespaced ('drag').
 *
 * @param  {String} name
 * @param  {*} detail
 */
Drag.prototype.dispatch = function(name, detail) {
  var e = new CustomEvent('drag' + name, { bubble: false, detail: detail })
  this.container.el.dispatchEvent(e);
  debug('dispatched', e);
};

/**
 * Add an event listener.
 *
 * @param  {String}   name
 * @param  {Function} fn
 */
Drag.prototype.on = function(name, fn) {
  this.container.el.addEventListener('drag' + name, fn);
}

/**
 * Remove and event listener.
 *
 * @param  {String}   name
 * @param  {Function} fn
 */
Drag.prototype.off = function(name, fn) {
  this.container.el.removeEventListener('drag' + name, fn);
}

/**
 * Utils
 */

function getPoint(e) {
  return ~e.type.indexOf('mouse') ? e : e.touches[0];
}

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('drag',this));