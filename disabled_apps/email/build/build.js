'use strict';

/* jshint node: true, evil: true */

var utils = require('utils');
var esomin = require('esomin');

// FIXME: It will be replace with webapp-shared.js
// Taken from r.js css optimizing step.
var cssImportRegExp = /\@import\s+(url\()?\s*([^);]+)\s*(\))?([\w, ]*)(;)?/ig;
var digests = [];
var appName;

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
  digests.push(utils.getHash(contents));
}

function writeCacheValue(options) {
  // Update the cache value based on digest values of all files.
  var finalDigest = utils.getHash(digests.join(','));
  var cacheRegExp = /HTML_CACHE_VERSION\s*=\s*["'][^"']+["']/;
  var cacheFile = utils.getFile(options.STAGE_APP_DIR, 'js',
                                'html_cache_restore.js');
  var contents = utils.getFileContent(cacheFile);
  contents = contents.replace(cacheRegExp,
    'HTML_CACHE_VERSION = \'' + finalDigest + '\'');

  utils.writeContent(cacheFile, contents);
}

function runOptimizer(args, requirejs) {
  var build = new Promise(function(resolve, reject) {
    requirejs.optimize(args, resolve, reject);
  });

  return build.then(function() {
    utils.log(appName, 'require.js optimize done');
  })
  .catch(function(err) {
    utils.log(appName, 'require.js optimize failed');
    utils.log(appName, err);
  });
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
  var logLevel = 'logLevel=' + (options.VERBOSE === '1' ? '0' : '4');
  return runOptimizer([gelamConfigFile.path, logLevel], r)
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
    mainFrameOptions.logLevel = (options.VERBOSE === '1') ? 0 : 4;

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
    return runOptimizer([appConfigFile.path, logLevel], r);
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
  return new Promise(function(resolve, reject) {
    r.tools.useLib(function(req) {
      req(['parse'], function(parse) {
        resolve(parse);
      });
    });
  });
}

exports.execute = function(options) {
  appName = utils.basename(options.APP_DIR);
  var shared = {
    js: [],
    style: [],
    style_unstable: []
  };
  var backendRegExp = /[\\\/]js[\\\/]ext[\\\/]/;
  var sharedJsonFile = utils.getFile(options.STAGE_APP_DIR, 'gaia_shared.json');

  var stageAppDir = utils.getFile(options.STAGE_APP_DIR);
  utils.ensureFolderExists(stageAppDir);

  var rjsPath = utils.joinPath(options.GAIA_DIR, 'build', 'r.js');
  var requirejs;

  if (utils.isNode()) {
    requirejs = require(rjsPath);
  } else {
    var sandbox = utils.createSandbox();
    sandbox.arguments = [];
    sandbox.requirejsAsLib = true;
    sandbox.print = function() {
      utils.log(appName, Array.prototype.join.call(arguments, ' '));
    };
    utils.runScriptInSandbox(rjsPath, sandbox);
    requirejs = sandbox.requirejs;
  }

  return optimize(options, requirejs)
    .then(function() {
      return getParse(requirejs);
    })
    .then(function(result) {
      shared.js = getSharedJs(result, options.APP_DIR,
        backendRegExp, onFileRead);
      var styles = getSharedStyles(options.APP_DIR, onFileRead);
      shared.style = styles[0];
      shared.style_unstable = styles[1];
      utils.writeContent(sharedJsonFile, JSON.stringify(shared, null, 2));

      writeCacheValue(options);
      removeLoader(options);
      removeFiles(options);
    })
    .then(function() {
      if (options.GAIA_OPTIMIZE === '1') {
        utils.log(appName, 'esomin minify done');
        return esomin.minifyDir(stageAppDir);
      }
    })
    .catch(function(err) {
      utils.log(err)
      utils.log(appName, 'running customize build failed');
      throw err;
    });
};
