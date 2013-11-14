/*global define*/

define(function(require) {
  'use strict';

  /**
   * addEventListener shorthand.
   * @param  {Element}   el
   * @param  {String}   name
   * @param  {Function} fn
   */
  var exports = function(el, name, fn, context) {
    el.addEventListener(name, fn.bind(context));
  };

  /**
   * removeEventListener shorthand.
   * @param  {Element}   el
   * @param  {String}   name
   * @param  {Function} fn
   */
  exports.unbind = function(el, name, fn) {
    el.removeEventListener(name, fn);
  };

  return exports;
});