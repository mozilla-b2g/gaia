/**
 * Scans the built directory's JS and CSS files looking for shared resources
 * to generate a gaia_shared.json
 */
/*global load, requirejs */

var requirejsAsLib = true;
load('../../build/r.js');

var shared = {
  js: [],
  style: [],
  style_unstable: []
};

// This file is run from the email directory.
var srcDir = './',
    buildDir = '../../build_stage/email/';

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
    // Remove the loader tag from the index.html file
    var indexPath = buildDir + 'index.html';
    file.saveFile(indexPath, file.readFile(indexPath)
                             .replace(/data-loader="[^"]+"/, ''));

    // Find all the JS files and scan them for shared resources
    var files = file.getFilteredFileList(buildDir + 'js', /\.js$/);
    files.forEach(function(fileName) {
      var deps = parse.findDependencies(fileName, file.readFile(fileName));
      deps.forEach(function (dep) {
        if (dep.indexOf('shared/') === 0) {
          shared.js.push(dep.replace(/shared\/js\//, '') + '.js');
        }
      });
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

    // Save the file
    file.saveFile(buildDir + 'gaia_shared.json',
                  JSON.stringify(shared, null, '  '));
  });
});