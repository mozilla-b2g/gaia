'use strict';

/* global require, exports */

var utils = require('utils');
var KeyboardLayoutConfigurator =
  require('./layout_configurator').KeyboardLayoutConfigurator;
var settingsConfig = require('./settings-config');

var KeyboardAppBuilder = function() {
};

// set options
KeyboardAppBuilder.prototype.setOptions = function(options) {
  this.enabledLayouts = options.GAIA_KEYBOARD_LAYOUTS.split(',');
  this.distDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
};

// Copy static files to build_stage.
KeyboardAppBuilder.prototype.copyStaticFiles = function() {
  // Files to blindly copy to build_stage regardless of versions
  var filenames = ['resources'];
  var dirs = [];

  dirs = dirs.concat('js', 'js/imes');
  // Unfortunately we have to explicitly list many files here
  // because the whitelist must not include optional layout
  // specific files.
  filenames = filenames.concat('index.html',
                               'locales',
                               'settings.html',
                               'style',
                               'js/render.js',
                               'js/settings',
                               'js/keyboard',
                               'js/views');

  dirs.forEach(function(dirName) {
    var dir = utils.getFile.apply(utils,
      [this.distDir.path].concat(dirName.split('/')));
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
  this.layoutConfigurator.copyFiles(this.distDir);
};

KeyboardAppBuilder.prototype.generateManifest = function() {
  var manifest =
    utils.getJSON(utils.getFile(this.appDir.path, 'manifest.webapp'));

  this.layoutConfigurator.addInputsToManifest(manifest);

  // Write content to build_stage
  utils.writeContent(utils.getFile(this.distDir.path, 'manifest.webapp'),
                     JSON.stringify(manifest, null, 2));
};

KeyboardAppBuilder.prototype.modifySettings = function() {
  if (settingsConfig.checkHandwriting(this.enabledLayouts)) {
    settingsConfig.addHandwritingSettings(this.appDir.path, this.distDir.path);
  }
};

KeyboardAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);

  this.layoutConfigurator =
    new KeyboardLayoutConfigurator(this.appDir);
  this.layoutConfigurator.loadLayouts(this.enabledLayouts);

  this.copyStaticFiles();
  this.copyLayouts();
  this.generateManifest();
  this.modifySettings();
};

exports.execute = function(options) {
  // We cannot export prototype functions out :(
  // so we run execute() this way.
  (new KeyboardAppBuilder()).execute(options);
};
