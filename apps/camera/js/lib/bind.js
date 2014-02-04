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
function bind(el, name, fn, capture) {
  el.addEventListener(name, fn, capture || false);
}

/**
 * removeEventListener shorthand.
 * @param  {Element}   el
 * @param  {String}   name
 * @param  {Function} fn
 */
exports.unbind = function(el, name, fn, capture) {
  el.removeEventListener(name, fn, capture || false);
};

});
