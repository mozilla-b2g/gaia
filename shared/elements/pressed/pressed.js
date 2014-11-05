;(function(define){define(function(require,exports,module){

/**
 * Pointer event abstraction to make
 * it work for touch and mouse.
 *
 * @type {Object}
 */
var pointer = [
  { down: 'touchstart', up: 'touchend' },
  { down: 'mousedown', up: 'mouseup' }
]['ontouchstart' in window ? 0 : 1];

exports = module.exports = function(el, options) {
  var released = (options && options.released) || 200;
  var min = (options && options.min) || 300;
  var timeouts = {};
  var removeReleased;

  el.addEventListener(pointer.down, function(e) {
    var start = e.timeStamp;
    var target = e.target;

    // If there is a removeRelease pending
    // run it before we add any more 'pressed'
    if (removeReleased) { removeReleased(); }

    // Add the 'pressed' class up the tree
    // and clear and pending timeouts.
    classListUp(target, 'add', 'pressed');
    clearTimeout(timeouts.pressed);

    addEventListener(pointer.up, function fn(e) {
      removeEventListener(pointer.up, fn, true);

      var duration = e.timeStamp - start;
      var delta = min - duration;
      var lag = Math.max(delta, 0);

      // Once we consider the 'press' event
      // to be over, we remove the 'pressed'
      // class and add a 'released' class.
      timeouts.pressed = setTimeout(function() {
        classListUp(target, 'remove', 'pressed');
        classListUp(target, 'add', 'released');

        removeReleased = function() {
          clearTimeout(timeouts.released);
          classListUp(target, 'remove', 'released');
          removeReleased = null;
        };

        timeouts.released = setTimeout(removeReleased, released);
      }, lag);
    }, true);
  }, true);
};

/**
 * Run a classList method on every
 * element up the DOM tree.
 *
 * @param  {Element} el
 * @param  {String} method
 * @param  {String} cls
 */
function classListUp(el, method, cls) {
  while (el && el.classList) {
    el.classList[method](cls);
    el = el.parentNode;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('pressed',this));