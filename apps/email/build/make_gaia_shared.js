/**
 * Scans the built directory's JS and CSS files looking for shared resources
 * to generate a gaia_shared.json
 */
/*jshint moz: true */
/*global load, requirejs, Components */

var requirejsAsLib = true;
load('../../build/r.js');

var converter =
      Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
      createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
converter.charset = "UTF-8";

var secClass = Components.classes["@mozilla.org/security/hash;1"];
var nsICryptoHash = Components.interfaces.nsICryptoHash;

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

// Adapted from:
// https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsICryptoHash#Computing_the_Hash_of_a_String
// return the two-digit hexadecimal code for a byte
function toHexString(charCode) {
  return ("0" + charCode.toString(16)).slice(-2);
}
function getDigest(contents) {
  var i,
      result = {};

  // data is an array of bytes
  var data = converter.convertToByteArray(contents, result);
  var ch = secClass.createInstance(nsICryptoHash);
  ch.init(ch.SHA1);
  ch.update(data, data.length);
  var hash = ch.finish(false);
  // convert the binary hash data to a hex string.
  return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
}

requirejs.tools.useLib(function(require) {
  require(['env!env/file', 'parse'], function(file, parse) {
    // Remove the loader tag from the index.html file
    var indexPath = buildDir + 'index.html';
    file.saveFile(indexPath, file.readFile(indexPath)
                             .replace(/data-loader="[^"]+"/, ''));

    var digests = [],
        jsExtRegExp = /\.js$/,
        backendRegExp = /[\\\/]js[\\\/]ext[\\\/]/;

    // Find all the HTML and JS files. Use the srcDir instead of
    // buildDir since uglification can mangle the files such that
    // the dependency scanning fails.
    var files = file.getFilteredFileList(srcDir + 'js', /\.js$|\.html$/);
    files.forEach(function(fileName) {
      var contents = file.readFile(fileName);

      digests.push(getDigest(contents));

      // If JS, scan for shared resources.
      if (jsExtRegExp.test(fileName) && !backendRegExp.test(fileName)) {
        var deps = parse.findDependencies(fileName, contents);

        deps.forEach(function (dep) {
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

    // Update the cache value based on digest values of all files.
    var finalDigest = getDigest(digests.join(',')),
        cacheRegExp = /var\s*CACHE_VERSION\s*=\s*'[^']+'/;

    [
      buildDir + 'js/html_cache_restore.js',
      buildDir + 'js/mail_app.js'
    ].forEach(function (fileName) {
      var contents = file.readFile(fileName);
      contents = contents.replace(cacheRegExp,
                                 'var CACHE_VERSION = \'' + finalDigest + '\'');
      file.saveFile(fileName, contents);
    });

  });
});