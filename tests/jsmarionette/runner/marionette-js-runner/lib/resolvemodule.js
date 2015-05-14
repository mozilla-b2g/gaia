'use strict';
var fsPath = require('path');

/**
 * Resolves a path to a given module. This only works if the module exports a
 * module from the root of its package (almost all modules ever).
 *
 *    resolveModule('mocha', 'bin', '_mocha');
 *    // => /node_modules/(...)/mocha/bin/_mocha
 *
 * @private
 * @param {String} module path.
 * @param {...*} parts to extend path with.
 * @return {String}
 */
function resolveModule(module, parts) {
  var args = Array.prototype.slice.call(arguments);
  parts = args.slice(1);

  // resolve the module
  var modulePath = fsPath.dirname(require.resolve(module));

  // add given parts of the path to the module path.
  return fsPath.join.apply(fsPath, [modulePath].concat(parts));
}

module.exports = resolveModule;
