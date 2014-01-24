/**
 * Scans the built directory's JS and CSS files looking for shared resources
 * to generate a gaia_shared.json
 */
/*jshint moz: true */
/*global load, requirejs, Components */

var requirejsAsLib = true;
load('../../build/r.js');

var shared = {
  js: [],
  style: [],
  style_unstable: []
};

// This file is run from the clock directory.
var srcDir = './',
    buildDir = '../../build_stage/clock/';

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

requirejs.tools.useLib(function(require) {
  require(['env!env/file', 'parse'], function(file, parse) {
    var jsExtRegExp = /\.js$/;

    // Find all the HTML and JS files. Use the srcDir instead of
    // buildDir since uglification can mangle the files such that
    // the dependency scanning fails.
    var files = file.getFilteredFileList(srcDir + 'js', /\.js$|\.html$/);
    files.forEach(function(fileName) {
      var contents = file.readFile(fileName);

      // If JS, scan for shared resources.
      if (jsExtRegExp.test(fileName)) {
        var deps = parse.findDependencies(fileName, contents);
        deps.forEach(function(dep) {

          if (dep.indexOf('shared/') === 0) {
            var sharedDep = dep.replace(/shared\/js\//, '') + '.js';
            // Avoid duplicate entries for cleanliness
            if (shared.js.indexOf(sharedDep) === -1) {
              shared.js.push(sharedDep);
            }
          }
        });
      }
    });

    // Find CSS references. Use the source area, instead of the build
    // area since the built version has @import statements inlined.
    files = file.getFilteredFileList(srcDir + 'style', /\.css$/);
    files.forEach(function(fileName) {
      var url, match, index,
          contents = file.readFile(fileName);

      contents = stripCssComments(contents);
      cssImportRegExp.lastIndex = 0;

      while ((match = cssImportRegExp.exec(contents))) {
        // Grab the URL without quotes
        url = match[2].replace(/['"]/g, '');
        if (url) {
          index = url.indexOf('/shared/');
          if (index !== -1) {
            if (url.indexOf('style_unstable') === -1) {
              shared.style.push(url.substring(index + 1)
                                   .replace(/shared\/style\//, ''));
            } else {
              shared.style_unstable.push(url.substring(index + 1)
                                    .replace(/shared\/style_unstable\//, ''));
            }
          }
        }
      }
    });

    // Save the shared resources file.
    file.saveFile(buildDir + 'gaia_shared.json',
                  JSON.stringify(shared, null, '  '));
  });
});
