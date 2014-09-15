(function(exports){
'use strict';

/**
 * Gets the element absolute offset top relative to the window top.
 */
exports.absoluteOffsetTop = function(el) {
  var top = 0;
  while (el) {
    var pos = window.getComputedStyle(el).position;
    if (pos === 'absolute' || pos === 'relative') {
      top += el.offsetTop;
    }
    el = el.parentElement;
  }
  return top;
};

/**
 * Gets the closest (parent) element that matches the given selector.
 */
exports.closest = function(el, selector) {
  while (el) {
    if (matches(el, selector)) {
      return el;
    }
    el = el.parentElement;
  }
};

function matches(el, selector) {
  // "matches" is only unprefixed on Fx 34
  return 'matches' in el ?
    el.matches(selector) :
    el.mozMatchesSelector(selector);
}

}(Calendar.ns('Utils').dom = {}));
