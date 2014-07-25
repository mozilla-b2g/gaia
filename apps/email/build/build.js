'use strict';

/* global require, exports */

var utils = require('utils');
var sharedUtils = require('shared-utils');
var { Cc, Ci } = require('chrome');
var converter =
      Cc['@mozilla.org/intl/scriptableunicodeconverter'].
      createInstance(Ci.nsIScriptableUnicodeConverter);
converter.charset = 'UTF-8';
var secClass = Cc['@mozilla.org/security/hash;1'];
var nsICryptoHash = Ci.nsICryptoHash;
var digests = [];

// Adapted from:
// https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsICryptoHash#Computing_the_Hash_of_a_String
// return the two-digit hexadecimal code for a byte
function toHexString(charCode) {
  return ('0' + charCode.toString(16)).slice(-2);
}

function onFileRead(contents) {
  digests.push(getDigest(contents));
}

function getDigest(contents) {
  var result = {};

  // data is an array of bytes
  var data = converter.convertToByteArray(contents, result);
  var ch = secClass.createInstance(nsICryptoHash);
  ch.init(ch.SHA1);
  ch.update(data, data.length);
  var hash = ch.finish(false);
  // convert the binary hash data to a hex string.
  return hash.split('').map(function(char, i) {
    return toHexString(hash.charCodeAt(i));
  }).join('');
}

function writeCacheValue(options) {
  // Update the cache value based on digest values of all files.
  var finalDigest = getDigest(digests.join(',')),
      cacheRegExp = /HTML_COOKIE_CACHE_VERSION\s*=\s*["'][^"']+["']/,
      cacheFile = utils.getFile(options.STAGE_APP_DIR, 'js',
        'html_cache_restore.js'),
      contents = utils.getFileContent(cacheFile);
  contents = contents.replace(cacheRegExp,
    'HTML_COOKIE_CACHE_VERSION = \'' + finalDigest + '\'');

  utils.writeContent(cacheFile, contents);
}

function optimize(options, r) {
  var deferred = utils.Q.defer();
  var optimizeOption = 'optimize=' + (options.GAIA_OPTIMIZE === '1' ?
    'uglify2' : 'none');
  var configFile = utils.getFile(options.APP_DIR, 'build', 'email.build.js');
  var stageShared = utils.getFile(options.STAGE_APP_DIR, 'shared');
  utils.ensureFolderExists(stageShared);

  r.optimize([configFile.path, optimizeOption], function() {
    deferred.resolve(options);
  }, function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
}

function removeLoader(options) {
  var indexFile = utils.getFile(options.STAGE_APP_DIR, 'index.html');
  var indexContent = utils.getFileContent(indexFile);
  utils.writeContent(indexFile,
    indexContent.replace(/data-loader="[^"]+"/, ''));
  return options;
}

function removeFiles(options) {
  var files = [
    utils.getFile(options.STAGE_APP_DIR, 'js','tmpl_builder.js'),
    utils.getFile(options.STAGE_APP_DIR, '.jshintrc')
  ];
  files.forEach(function(file) {
    file.remove(false);
  });
}

function getParse(r) {
  var deferred = utils.Q.defer();
  r.tools.useLib(function(req) {
    req(['parse'], function(parse) {
      deferred.resolve(parse);
    });
  });
  return deferred.promise;
}

exports.execute = function(options) {
  var shared = {
    js: [],
    style: [],
    style_unstable: []
  };
  var backendRegExp = /[\\\/]js[\\\/]ext[\\\/]/;
  var sharedJsonFile = utils.getFile(options.STAGE_APP_DIR, 'gaia_shared.json');

  var stageAppDir = utils.getFile(options.STAGE_APP_DIR);
  utils.ensureFolderExists(stageAppDir);
  var r = require('r-wrapper').get(options.GAIA_DIR);
  var promises = [
    optimize(options, r),
    getParse(r)
  ];
  utils.Q.all(promises)
    .then(function(result) {
      var [options, parse] = result;

      shared.js = sharedUtils.getSharedJs(parse, options.APP_DIR,
        backendRegExp, onFileRead);
      [shared.style, shared.style_unstable] =
        sharedUtils.getSharedStyles(options.APP_DIR, onFileRead);
      utils.writeContent(sharedJsonFile, JSON.stringify(shared, null, 2));

      writeCacheValue(options);
      removeLoader(options);
      removeFiles(options);
    });
};
