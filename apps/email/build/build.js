'use strict';

/*global require, exports */
/*jshint evil: true */
var utils = require('utils');
var esomin = require('esomin');
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

/**
 * Copy the services.json file to the root of the staging dir.
 */
function generateServicesConfig(options) {
  var path = options.EMAIL_SERVICES_PATH,
      stageJsPath = utils.joinPath(options.STAGE_APP_DIR, 'js');

  // Just copy over the default file
  if (!path) {
    var sourcePath = utils.joinPath(options.APP_DIR, 'js', 'services.js');
    utils.copyFileTo(sourcePath, stageJsPath, 'services.js');
    return;
  }

  // read the pretty JSON
  var services = utils.readJSONFromPath(path);
  // and write out ugly JSON
  utils.writeContent(
    utils.getFile(stageJsPath, 'services.js'),
    'define(' + JSON.stringify(services) + ');');
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
      cacheRegExp = /HTML_CACHE_VERSION\s*=\s*["'][^"']+["']/,
      cacheFile = utils.getFile(options.STAGE_APP_DIR, 'js',
        'html_cache_restore.js'),
      contents = utils.getFileContent(cacheFile);
  contents = contents.replace(cacheRegExp,
    'HTML_CACHE_VERSION = \'' + finalDigest + '\'');

  utils.writeContent(cacheFile, contents);
}

function runOptimizer(args, r) {
  var deferred = utils.Q.defer();
  r.optimize(args, function(buildText) {
    deferred.resolve(buildText);
  }, function(err) {
    deferred.reject(err);
  });
  return deferred.promise;
}

function optimize(options, r) {
  var gelamConfigFile = utils.getFile(options.APP_DIR,
                        'build', 'gelam_worker.build.js');
  var mainFrameConfigFile = utils.getFile(options.APP_DIR,
                            'build', 'main-frame-setup.build.js');
  var appConfigFile = utils.getFile(options.APP_DIR, 'build', 'email.build.js');
  var stageShared = utils.getFile(options.STAGE_APP_DIR, 'shared');
  var stageJs = utils.getFile(options.STAGE_APP_DIR, 'js');
  var extPrefix = /^.*[\\\/]email[\\\/]js[\\\/]ext[\\\/]/;

  utils.ensureFolderExists(stageShared);
  utils.ensureFolderExists(stageJs);

  // Make sure services.js is up to date.
  generateServicesConfig(options);

  // Do gelam worker stuff first. This will copy over all of the js/ext
  // directory.
  return runOptimizer([gelamConfigFile.path], r)
  .then(function() {
    // Now do main-frame-setup build for the main thread side of gelam. It is
    // a single file optimization, so need to manually delete files it combines
    // from the staging area.

    // Manually load and eval the options so that a function callback can be
    // added to the build options.
    var mainFrameOptions = eval('(' +
                           utils.getFileContent(mainFrameConfigFile) +
                           ')');
    // Up the log level so we can see what was built. By default, passing object
    // args to r.js will run it in silent mode.
    mainFrameOptions.logLevel = 0;

    // Update paths, since it is now relative to the current working directory
    // of this script, not the gelamConfigFile.
    mainFrameOptions.baseUrl = utils.getFile(options.APP_DIR, 'js').path;
    mainFrameOptions.out = utils.getFile(options.STAGE_APP_DIR,
                           'js', 'ext', 'main-frame-setup.js').path;

    // Minification handled later by esomin
    mainFrameOptions.optimize = 'none';

    mainFrameOptions.onModuleBundleComplete = function(data) {
      // Called on layer completion. Get data.included for included files and
      // remove those files from build_stage. This does not happen automatically
      // because the gelam build is a single file optimization target from the
      // source area to build_stage, so it does not know of the other files that
      // are already in build_stage as the result of the main gaia app build.
      data.included.forEach(function(sourceLocation) {
        var destFile = utils.getFile(options.STAGE_APP_DIR, 'js', 'ext',
                                     sourceLocation.replace(extPrefix, ''));
        if (destFile.exists() &&
            destFile.path.indexOf('main-frame-setup') === -1) {
          destFile.remove(false);
        }
      });
    };

    return runOptimizer(mainFrameOptions, r);
  })
  .then(function() {
    // Now the rest of the gaia app optimization. This build run explicitly
    // ignores the ext directory.
    return runOptimizer([appConfigFile.path], r);
  });
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
    if (utils.fileExists(file.path)) {
      file.remove(false);
    }
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
    style_unstable: [],
    elements: []
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
  return utils.Q.all(promises)
    .then(function(result) {
      var [buildText, parse] = result;

      shared.js = sharedUtils.getSharedJs(parse, options.APP_DIR,
        backendRegExp, onFileRead);
      [shared.style, shared.style_unstable, shared.elements] =
        sharedUtils.getSharedStyles(options.APP_DIR, onFileRead);
      utils.writeContent(sharedJsonFile, JSON.stringify(shared, null, 2));

      writeCacheValue(options);
      removeLoader(options);
      removeFiles(options);
    })
    .then(function() {
      if (options.GAIA_OPTIMIZE === '1') {
        utils.log('email', 'Using esomin to minify');
        return esomin.minifyDir(stageAppDir);
      }
    })
    .catch(function (err) {
      utils.log(err);
      utils.log(err.stack);
      throw err;
    });
};
