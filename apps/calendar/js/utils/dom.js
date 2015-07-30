define(function(require, exports) {
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

/**
 * converts HTML string into a DOM element
 */
exports.buildElement = function(html) {
  var fragment = document.createElement('div');
  fragment.innerHTML = html;
  return fragment.firstChild;
};

/**
 * detach elements from DOM
 * supports single element or array-like objects
 */
exports.removeElements = function(els) {
  if (!els) {
    return;
  }
  els = 'length' in els ? Array.from(els) : Array.from(arguments);
  els.forEach(el => {
    el && el.parentNode && el.parentNode.removeChild(el);
  });
};

});
