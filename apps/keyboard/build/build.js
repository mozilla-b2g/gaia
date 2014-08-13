'use strict';

/* global require, exports */

var utils = require('utils');
var keyboardConfig = require('./keyboard-config');

var KeyboardAppBuilder = function() {
};

// set options
KeyboardAppBuilder.prototype.setOptions = function(options) {
  this.enabledLayouts = options.GAIA_KEYBOARD_LAYOUTS.split(',');
  this.distDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
};

KeyboardAppBuilder.prototype.includeAllLayouts = function() {
  var layoutDir = utils.getFile(this.appDir.path, 'js', 'layouts');
  var enabledLayouts = [];
  utils.ls(layoutDir, false).forEach(function(file) {
    if (!file.leafName.endsWith('.js')) {
      return;
    }

    enabledLayouts.push(file.leafName.substr(0, file.leafName.length - 3));
  });

  this.enabledLayouts = enabledLayouts;
};

KeyboardAppBuilder.prototype.throwForNoneExistLayouts = function() {
  this.enabledLayouts.forEach(function(layoutName) {
    var file = utils.getFile(
      this.appDir.path, 'js', 'layouts', layoutName + '.js');
    if (file.exists()) {
      return;
    }
    throw new Error('Keyboard layout ' + layoutName + '.js specified by ' +
      'GAIA_KEYBOARD_LAYOUTS not found.');
  }.bind(this));
};

// Copy static files to build_stage.
KeyboardAppBuilder.prototype.copyStaticFiles = function() {
  // Files to blindly copy to build_stage regardless of versions
  var filenames = ['resources'];
  var dirs = [];

  dirs = dirs.concat('js', 'js/imes', 'js/imes/latin');
  // Unfortunately we have to explicitly list many files here
  // because the whitelist most not include optional layout
  // specific files.
  filenames = filenames.concat('index.html',
                               'locales',
                               'settings.html',
                               'style',
                               'js/render.js',
                               'js/settings',
                               'js/keyboard',
                               'js/views',
                               'js/imes/latin/latin.js',
                               'js/imes/latin/predictions.js',
                               'js/imes/latin/worker.js');

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

  keyboardConfig.copyLayoutsAndResources(
    this.appDir, this.distDir, this.enabledLayouts);
};

KeyboardAppBuilder.prototype.generateManifest = function() {
  // XXX we probably need better separation between this
  // and keyboard-config.js

  var manifest =
    utils.getJSON(utils.getFile(this.appDir.path, 'manifest.webapp'));

  manifest = keyboardConfig.addEntryPointsToManifest(
    this.appDir, this.distDir, this.enabledLayouts, manifest);

  // Write content to build_stage
  utils.writeContent(utils.getFile(this.distDir.path, 'manifest.webapp'),
                     JSON.stringify(manifest));
};


KeyboardAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);

  if (this.enabledLayouts.indexOf('*') !== -1) {
    this.includeAllLayouts();
  } else {
    this.throwForNoneExistLayouts();
  }
  this.copyStaticFiles();
  this.copyLayouts();
  this.generateManifest();
};

exports.execute = function(options) {
  // We cannot export prototype functions out :(
  // so we run execute() this way.
  (new KeyboardAppBuilder()).execute(options);
};
