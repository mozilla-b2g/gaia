'use strict';

/* global require, exports */

let utils = require('utils');

var KeyboardLayoutDetail = function(id) {
  this.id = id;
};

// A KeyboardLayoutDetail instance contains the following properties.
// They are intentionally named to avoid the word "name".
// Filenames are "id"s and the label for humans are "label"s.
// The actual nsIFile are "file" or "dir"s.
KeyboardLayoutDetail.prototype.id = undefined;
KeyboardLayoutDetail.prototype.label = undefined;
KeyboardLayoutDetail.prototype.layoutFile = null;
KeyboardLayoutDetail.prototype.types = null;
KeyboardLayoutDetail.prototype.imEngineId = undefined;
KeyboardLayoutDetail.prototype.imEngineDir = null;
KeyboardLayoutDetail.prototype.preloadDictRequired = undefined;
KeyboardLayoutDetail.prototype.dictId = undefined;
KeyboardLayoutDetail.prototype.dictFile = null;
KeyboardLayoutDetail.prototype.dictFilePath = null;

// Read the .js file for the named keyboard layout and extract
// its information.
KeyboardLayoutDetail.prototype.load = function(appDir) {
  var id = this.id;

  var layoutFile = this.layoutFile =
    utils.getFile(appDir.path, 'js', 'layouts' , id + '.js');

  if (!layoutFile.exists()) {
    throw new Error('KeyboardLayoutDetail: Keyboard layout ' + id + '.js' +
      ' specified by GAIA_KEYBOARD_LAYOUTS not found in ' + appDir.path);
  }

  // The keyboard layout files are JavaScript files that add properties
  // to the Keybords object. They are not clean JSON, so we have to use
  // use the scriptloader to load them. That also gives stacktraces for
  // errors inside the keyboard file.
  // They reference globals KeyEvent and KeyboardEvent, so we
  // have to define those on the context object.
  var win = { Keyboards: {},
              KeyEvent: {},
              KeyboardEvent: {} };

  utils.scriptLoader.load(layoutFile.path, win, true);

  if (!(id in win.Keyboards)) {
    throw new Error('KeyboardLayoutDetail: Keyboard layout ' + id + '.js' +
      ' did not expose itself correctly.');
  }

  // These properties exists in all layouts.
  this.label = win.Keyboards[id].menuLabel;
  this.types = win.Keyboards[id].types;
  this.imEngineId = win.Keyboards[id].imEngine;
  if (this.imEngineId) {
    this.imEngineDir =
      utils.getFile(appDir.path, 'js', 'imes', this.imEngineId);

    if (!this.imEngineDir.exists()) {
      throw new Error('KeyboardLayoutDetail: Keyboard layout ' + id + '.js' +
        ' specified a non-exist ime.');
    }
  }

  // Handle its dictionary declarations, if any.
  switch (this.imEngineId) {
    case 'latin':
      this.dictId = win.Keyboards[id].autoCorrectLanguage;
      if (this.dictId) {
        this.preloadDictRequired = true;
        this.dictFile = utils.getFile(appDir.path, 'js', 'imes', 'latin',
                                      'dictionaries', this.dictId + '.dict');

        if (!this.dictFile.exists()) {
          throw new Error('KeyboardLayoutDetail: ' +
            'Keyboard layout ' + id + '.js' +
            ' specified a non-exist dictionary for latin engine.');
        }
      } else {
        this.preloadDictRequired = false;
      }
      break;

    case 'handwriting':
    case 'jskanji':
    case 'jspinyin':
    case 'jszhuyin':
      // These IMs come with dictionary data in the tree. They must be
      // excluded in a "noPreloadDictRequired" build to conserve build size.
      this.preloadDictRequired = true;
      break;

    case 'jsavrophonetic':
    case 'jstelex':
    case 'india':
    case 'jshangul':
    case 'vietnamese':
      // These IMs only come with some logic in JavaScript with no preload
      // dictionaries -- we can safely include them w/o taking too much size.
      this.preloadDictRequired = false;
      break;

    default:
      // It's possible the layout doesn't have an IMEngine, and it's acceptible.
      if (!this.imEngineId) {
        return;
      }

      // Throw so people are forced to place their IMEngine correctly here.
      throw new Error('KeyboardLayoutDetail: Found an unknown imEngine: "' +
        this.imEngineId + '".');
  }
};

var KeyboardLayoutConfigurator = function(appDir) {
  this.appDir = appDir;
};

KeyboardLayoutConfigurator.prototype.loadLayouts = function(layoutIds) {
  var layoutIdSet = new Set(layoutIds);

  if (layoutIdSet.size === 0) {
    throw new Error('KeyboardLayoutConfigurator: No layout specified?');
  }

  this.layoutDetails = [];
  layoutIdSet.forEach(function(layoutId) {
    var detail = new KeyboardLayoutDetail(layoutId);
    detail.load(this.appDir);

    this.layoutDetails.push(detail);
  }, this);
};

KeyboardLayoutConfigurator.prototype._listAllLayouts = function(testFunc) {
  var layoutDir = utils.getFile(this.appDir.path, 'js', 'layouts');
  return utils.ls(layoutDir, false).forEach(function(file) {
    if (!file.leafName.endsWith('.js')) {
      return false;
    }

    var layoutId = file.leafName.substr(0, file.leafName.length - 3);

    if (testFunc) {
      var detail = new KeyboardLayoutDetail(layoutId);
      detail.load(this.appDir);
      if (!testFunc(detail)) {
        return false;
      }
    }

    return true;
  }, this);
};

KeyboardLayoutConfigurator.prototype.copyFiles = function(distDir) {
  // Copy the layout file to where it needs to go
  let layoutDest = utils.getFile(distDir.path, 'js', 'layouts');
  utils.ensureFolderExists(layoutDest);
  this.layoutDetails.forEach(function(layoutDetail) {
    layoutDetail.layoutFile.copyTo(
      layoutDest, layoutDetail.layoutFile.leafName);
  }, this);

  // Copy the entire imEngineDir or selected files if applicable.
  this._copyIMEngineDirs(distDir);

  // Copy the dictFile if applicable.
  this._copyDicts(distDir);
};

KeyboardLayoutConfigurator.prototype._copyIMEngineDirs = function(distDir) {
  let imeDest = utils.getFile(distDir.path, 'js', 'imes');

  this.layoutDetails.forEach(function(layoutDetail) {
    if (!layoutDetail.imEngineId) {
      return;
    }

    var imEngineDirDest = imeDest.clone();
    imEngineDirDest.append(layoutDetail.imEngineId);

    // Don't try to copy the dir again.
    if (imEngineDirDest.exists()) {
      return;
    }

    // Copy the entire imEngineDir or selected files if applicable.
    switch (layoutDetail.imEngineId) {
      case 'latin':
        utils.ensureFolderExists(imEngineDirDest);
        utils.ls(layoutDetail.imEngineDir, false).forEach(function(file) {
          if (file.leafName === 'dictionaries') {
            return;
          }

          file.copyTo(imEngineDirDest, file.leafName);
        });

        break;

      default:
        layoutDetail.imEngineDir.copyTo(
          imeDest, layoutDetail.imEngineDir.leafName);

        break;
    }
  }, this);
};

KeyboardLayoutConfigurator.prototype._copyDicts = function(distDir) {
  let dictDests = {
    latin: utils.getFile(distDir.path, 'js', 'imes', 'latin', 'dictionaries')
  };

  this.layoutDetails.forEach(function(layoutDetail) {
    // Copy the dictFile if applicable.
    switch (layoutDetail.imEngineId) {
      case 'latin':
        if (!layoutDetail.dictFile) {
          return;
        }

        utils.ensureFolderExists(dictDests.latin);
        layoutDetail.dictFile.copyTo(
          dictDests.latin, layoutDetail.dictFile.leafName);

        break;
    }
  }, this);
};

KeyboardLayoutConfigurator.prototype.addInputsToManifest = function(manifest) {
  this.layoutDetails.forEach(function(layoutDetail) {
    manifest.inputs[layoutDetail.id] = {
      launch_path: '/index.html#' + layoutDetail.id,
      name: layoutDetail.label,
      description: layoutDetail.label,
      types: layoutDetail.types
    };
  });
};

exports.KeyboardLayoutConfigurator = KeyboardLayoutConfigurator;
