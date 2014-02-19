'use strict';

/* global require, exports */

var utils = require('utils');
var keyboardConfig = require('./keyboard-config');

var KeyboardAppBuilder = function() {
};

// set options
KeyboardAppBuilder.prototype.setOptions = function(options) {
  this.allLayouts = options.GAIA_KEYBOARD_LAYOUTS.split(',');
  this.distDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
};

KeyboardAppBuilder.prototype.getLayoutsForVersion = function(version) {
  var layouts = [];
  switch (version) {
    case 'one':
      this.allLayouts.forEach(function(layoutName) {
        var file = utils.getFile(
          this.appDir.path, 'js', 'layouts', layoutName + '.js');
        if (file.exists()) {
          layouts.push(layoutName);
        }
      }.bind(this));

      break;

    case 'two':
      // TBD

      break;
  }

  return layouts;
};

KeyboardAppBuilder.prototype.throwForNoneExistLayouts = function() {
  this.allLayouts.forEach(function(layoutName) {
    if (this.versionOneLayouts.indexOf(layoutName) === -1 &&
      this.versionTwoLayouts.indexOf(layoutName) === -1) {
      throw new Error('Keyboard layout ' + layoutName + '.js specified by ' +
        'GAIA_KEYBOARD_LAYOUTS not found.');
    }
  }.bind(this));
};

// Copy static files to build_stage.
KeyboardAppBuilder.prototype.copyStaticFiles = function() {
  // Files to blindly copy to build_stage regardless of versions
  var filenames = ['resources'];
  var dirs = [];

  if (this.versionOneLayouts.length) {
    dirs = dirs.concat('js', 'js/imes', 'js/imes/latin');
    // Unfortunately we have to explicitly list many files here
    // because the whitelist most not include optional layout
    // specific files.
    filenames = filenames.concat('index.html', 'locales',
                                 'settings.html', 'style',
                                 'js/keyboard.js', 'js/layout.js',
                                 'js/render.js', 'js/settings',
                                 'js/imes/latin/latin.js',
                                 'js/imes/latin/predictions.js',
                                 'js/imes/latin/worker.js');
  }
  if (this.versionTwoLayouts.length) {
    /* TBD, maybe

    filenames = filenames.concat('index2.html', 'style2', 'js2');

    and move more shared files out of the two `if` blocks.

    */
  }

  dirs.forEach(function(dirName) {
    var dir = utils.getFile.apply(utils,
      [this.appDir.path].concat(dirName.split('/')));
    utils.ensureFolderExists(dir);
  }.bind(this));

  filenames.forEach(function(filename) {
    var filenameArr = filename.split('/');

    var file = utils.getFile.apply(utils,
      [this.appDir.path].concat(filenameArr));
    var distSubDir = utils.getFile.apply(utils,
      [this.distDir.path].concat(filenameArr.slice(0, filenameArr.length - 1)));
    var targetFile = distSubDir.clone();
    targetFile.append(file.leafName);
    if (targetFile.exists()) {
      targetFile.remove(true);
    }
    file.copyTo(distSubDir, file.leafName);
  }.bind(this));
};

KeyboardAppBuilder.prototype.copyLayouts = function() {
  // XXX we probably need better separation between this
  // and keyboard-config.js

  // For v1 keyboard
  keyboardConfig.copyLayoutsAndResources(
    this.appDir, this.distDir, this.versionOneLayouts);

  // TBD: v2
};

KeyboardAppBuilder.prototype.generateManifest = function() {
  // XXX we probably need better separation between this
  // and keyboard-config.js

  var manifest =
    utils.getJSON(utils.getFile(this.appDir.path, 'manifest.webapp'));

  // For v1 keyboard
  manifest = keyboardConfig.addEntryPointsToManifest(
    this.appDir, this.distDir, this.versionOneLayouts, manifest);

  // TBD: v2

  // Write content to build_stage
  utils.writeContent(utils.getFile(this.distDir.path, 'manifest.webapp'),
                     JSON.stringify(manifest));
};

KeyboardAppBuilder.prototype.cleanDirectory = function(path) {
  var dir = this.distDir.clone();
  path.split('/').forEach(function(part) {
    dir.append(part);
  });
  dir.remove(true);
  utils.ensureFolderExists(dir);
};

KeyboardAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);

  // Check against allLayouts. Most of the code should be gone with v1 keyboard.
  this.versionOneLayouts = this.getLayoutsForVersion('one');
  this.versionTwoLayouts = this.getLayoutsForVersion('two');
  this.throwForNoneExistLayouts();
  this.cleanDirectory('js/imes');
  this.cleanDirectory('js/layouts');
  this.copyStaticFiles();
  this.copyLayouts();
  this.generateManifest();
};

exports.execute = function(options) {
  // We cannot export prototype functions out :(
  // so we run execute() this way.
  (new KeyboardAppBuilder()).execute(options);
};
