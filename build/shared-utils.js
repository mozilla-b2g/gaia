'use strict';

/* global exports, require */

var utils = require('utils');

// Taken from r.js css optimizing step.
var cssImportRegExp = /\@import\s+(url\()?\s*([^);]+)\s*(\))?([\w, ]*)(;)?/ig;

function stripCssComments(contents) {
  var index,
      start = 0,
      end = contents.length,
      result = '',
      startComment = '/*',
      endComment = '*/';

  while ((index = contents.indexOf(startComment, start)) !== -1) {
    result += contents.substring(start, index);
    start = index;
    index = contents.indexOf(endComment, start);
    if (index === -1) {
      start = end - 1;
    } else {
      start = index + 2;
    }
  }

  if (start !== end - 1) {
    result += contents.substring(start, end);
  }

  return result;
}


/**
 * Find javascript dependencies in shared directory for all JS files in js
 * directory for each app directory, and also call onFileRead for all js and
 * HTML files.
 * @param  {Object}   parse      Parser module from r.js
 * @param  {String}   appDir     App directory in gaia source tree
 * @param  {RegExp}   exclude    exclude expression for js files
 * @param  {Function} onFileRead Event handler when file contents has been
 *                               retrieved.
 * @return {String[]}            javascript dependencies in shared directory
 */
function getSharedJs(parse, appDir, exclude, onFileRead) {
  var sharedJs = [];
  var jsExtRegExp = /\.js$/;

  var files = utils.ls(utils.getFile(appDir, 'js'), true)
    .filter(function(file) {
      return /\.(js|html)/.test(file.path) && file.isFile();
    });
  files.forEach(function(file) {
    var contents = utils.getFileContent(file);
    onFileRead(contents);

    // If JS, scan for shared resources.
    if (jsExtRegExp.test(file.path) && !exclude.test(file.path)) {
      var deps = parse.findDependencies(file.path, contents);

      deps.forEach(function (dep) {
        if (dep.indexOf('shared/') === 0) {
          var sharedDep = dep.replace(/shared\/js\//, '') + '.js';
          // Avoid duplicate entries for cleanliness
          if (sharedJs.indexOf(sharedDep) === -1) {
            sharedJs.push(sharedDep);
          }
        }
      });
    }
  });
  return sharedJs;
}

/**
 * Find CSS references in shared directory for all the CSS files and call
 * onFileRead() in style directory for each app directory.
 * @param  {String} appDir     App directory in gaia source tree
 * @param  {[type]} onFileRead Event handler when file contents has been
 *                             retrieved.
 * @return {String[][]}        an array contains style and style_unstable css
 *                             files in shared directory.
 */
function getSharedStyles(appDir, onFileRead) {
  var sharedStyle = [];
  var sharedStyleUnstable = [];
  var sharedElements = [];
  var files = utils.ls(utils.getFile(appDir, 'style'), true)
    .filter(function(file) {
      return /\.css$/.test(file.path);
    });
  files.forEach(function(file) {
    var url, match, index,
        contents = utils.getFileContent(file);
    onFileRead(contents);
    contents = stripCssComments(contents);
    cssImportRegExp.lastIndex = 0;

    while ((match = cssImportRegExp.exec(contents))) {
      // Grab the URL without quotes
      url = match[2].replace(/['"]/g, '');
      if (url) {
        index = url.indexOf('/shared/');
        if (index !== -1) {
          if (url.indexOf('shared/elements') !== -1) {
            sharedElements.push(url.substring(index + 1)
                                    .replace(/shared\/elements\//, ''));
          } else if (url.indexOf('style_unstable') === -1) {
            sharedStyle.push(url.substring(index + 1)
                                 .replace(/shared\/style\//, ''));
          } else {
            sharedStyleUnstable.push(url.substring(index + 1)
                                .replace(/shared\/style_unstable\//, ''));
          }
        }
      }
    }
  });
  return [sharedStyle, sharedStyleUnstable, sharedElements];
}

exports.getSharedJs = getSharedJs;
exports.getSharedStyles = getSharedStyles;
