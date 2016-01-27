/*jshint node: true */
'use strict';

/**
 * Handles running a JS minifier over a directory, only picking out the .js
 * files for minification, or allowing a minification of a specfic file in
 * place. By default, uses an AST-backed minifier, in astMinify, but the file
 * methods allow passing in a function that handles the actual minification.
 */

var esprima = require('./esomin/esprima');
var escodegen = require('./esomin/escodegen');
var utils = require('utils');
var jsSuffix = /\.js$/;

/**
 * Minifies all .js files found in the given directory path string. Can pass
 * a custom minifyFn that does the minification. If no minifyFn is passed, then
 * the default of astMinify will be used.
 */
exports.minifyDir = function(dirPath, minifyFn) {
  utils.listFiles(dirPath, utils.FILE_TYPE_FILE, true)
  .forEach(function(filePath) {
    if (jsSuffix.test(filePath)) {
      exports.minifyFile(filePath, minifyFn);
    }
  });
};

/**
 * Minifies the file at the given filePath string. If it has a problem minifying
 * the file, it will just skip it. Can pass a custom minifyFn that does the
 * minification. If no minifyFn is passed, then the default of astMinify with
 * its default options will be used. To use jsmin:
 *
 * minifyFile(filePath, function(contents) {
 *   return require('jsmin')(contents).code;
 * });
 */
exports.minifyFile = function(filePath, minifyFn) {
  minifyFn = minifyFn || exports.astMinify;
  try {
    var file = utils.getFile(filePath);
    var contents = utils.getFileContent(file);
    utils.writeContent(file, minifyFn(contents));
  } catch(e) {
    utils.log('esomin', 'Unable to minify, skipping ' + filePath);
  }
};

/*
 * Does some minification, via an AST. Allows some es6 features to be used, like
 * arrow functions and template strings. Currently uglify cannot handle them.
 *
 * Long term want to use Reflect.parse to get a speed boost, but there are some
 * incompatibilities with its AST and the escodegen/esmangle tools, tracked in
 * bug 913617.
 *
 * Also, this module only does comment removal right now. That is the biggest
 * minification win, but over time want to use esmangle, see esmangle notes
 * below.
 *
 * More research details here:
 * https://github.com/jrburke/esomin
 */
exports.astMinify = function(contents, options) {
  var ast = esprima.parse(contents);

  // Long term TODO, use esmangle, https://github.com/Constellation/esmangle
  // to do name mangling. Unfortunately it is not able to handle the es6-ish
  // AST yet.

  // There are some options fo escodegen, like removing line returns, but
  // not using them to preserve line returns to give better debugging
  // experience. Options are here:
  // https://github.com/Constellation/escodegen/wiki/API
  return escodegen.generate(ast, options);
};

