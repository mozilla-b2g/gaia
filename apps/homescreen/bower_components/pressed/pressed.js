;(function(define){'use strict';define(function(require,exports,module){

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

module.exports = function(el, options) {
  var released = (options && options.released) || 200;
  var scope = (options && options.scope) || el;
  var min = (options && options.min) || 300;
  var instant = options && options.instant;
  var timeouts = {};
  var removeReleased;

  el.addEventListener(pointer.down, function(e) {
    var start = e.timeStamp;
    var target = e.target;
    var pressed = false;
    var last = e;

    // If there is a removeRelease pending
    // run it before we add any more 'pressed'
    if (removeReleased) { removeReleased(); }

    if (instant) { onPressed(); }
    else { notScrolling(e, onPressed); }

    function onPressed() {
      classListUp(target, scope, 'add', 'pressed');
    }

    addEventListener(pointer.up, function fn(e) {
      removeEventListener(pointer.up, fn, true);

      var duration = e.timeStamp - start;
      var delta = min - duration;
      var lag = Math.max(delta, 0);

      // Once we consider the 'press' event
      // to be over, we remove the 'pressed'
      // class and add a 'released' class.
      timeouts.pressed = setTimeout(function() {
        classListUp(target, scope, 'remove', 'pressed');
        classListUp(target, scope, 'add', 'released');

        removeReleased = function() {
          clearTimeout(timeouts.released);
          classListUp(target, scope, 'remove', 'released');
          removeReleased = null;
        };

        timeouts.released = setTimeout(removeReleased, released);
      }, lag);
    }, true);
  }, true);
};

function notScrolling(e, fn) {
  detectScrolling(e, function(scrolling) {
    if (!scrolling) { fn(); }
  });
}

function detectScrolling(e, fn) {
  var period = 76;
  var last = e;

  if (windowScrolling) { return fn(true); }
  if (!e.touches) { return fn(false); }

  addEventListener('touchmove', onTouchMove, true);
  setTimeout(detect, period);

  function detect() {
    removeEventListener('touchmove', onTouchMove, true);
    if (windowScrolling) { return fn(true); }
    var time = last.timeStamp - e.timeStamp;
    var distance = getDistance(e.touches[0], last.touches[0]);
    var speed = distance / time;
    var scrolling = speed > 0.03;
    fn(scrolling);
  }

  function onTouchMove(e) { last = e; }

  function getDistance(a, b) {
    var xs = 0;
    var ys = 0;

    xs = b.clientX - a.clientX;
    xs = xs * xs;

    ys = b.clientY - a.clientY;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
  }
}

var windowScrolling = false;
var scrollTimeout;

// addEventListener('scroll', function() {
//   windowScrolling = true;
//   clearTimeout(scrollTimeout);
//   scrollTimeout = setTimeout(function() {
//     windowScrolling = false;
//   }, 60);
// });

/**
 * Run a classList method on every
 * element up the DOM tree, until
 * the given scope.
 *
 * @param  {Element} el
 * @param {Element} scope
 * @param  {String} method
 * @param  {String} cls
 */
function classListUp(el, scope, method, cls) {
  while (el && el.classList && el !== scope.parentNode) {
    el.classList[method](cls);
    el = el.parentNode;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('pressed',this));
