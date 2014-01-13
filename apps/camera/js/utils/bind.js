define(function(require, exports, module) {
'use strict';

/**
 * Exports
 */

exports = module.exports = bind;

/**
 * addEventListener shorthand.
 * @param  {Element}   el
 * @param  {String}   name
 * @param  {Function} fn
 */
function bind(el, name, fn, context) {
  if (context) { fn = fn.bind(context); }
  el.addEventListener(name, fn);
}

/**
 * removeEventListener shorthand.
 * @param  {Element}   el
 * @param  {String}   name
 * @param  {Function} fn
 */
exports.unbind = function(el, name, fn) {
  el.removeEventListener(name, fn);
};

});
