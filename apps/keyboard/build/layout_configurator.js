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
KeyboardLayoutDetail.prototype.noIncludeInExpandLayoutIdSet = undefined;

// How size is counted is imEngine dependent.
KeyboardLayoutDetail.prototype.fileSize = null;
KeyboardLayoutDetail.prototype.preloadDictRequired = undefined;

KeyboardLayoutDetail.prototype.dictPreloaded = false;

// The nsIFile instance points to the dictionary file in the tree.
KeyboardLayoutDetail.prototype.dictFile = null;

// The filename of the dictionary; use for construting CDN URL.
// Must be unique for a given resource.
KeyboardLayoutDetail.prototype.dictFilename = undefined;

// The path within the packaged app, relative to the imEngine dir root.
// Must be unique for a given resource.
// This is also used to construct database ID.
KeyboardLayoutDetail.prototype.dictFilePath = undefined;

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
  this.types = win.Keyboards[id].types.sort();
  this.imEngineId = win.Keyboards[id].imEngine;
  this.noIncludeInExpandLayoutIdSet =
    win.Keyboards[id].noIncludeInExpandLayoutIdSet;
  if (this.imEngineId) {
    this.imEngineDir =
      utils.getFile(appDir.path, 'js', 'imes', this.imEngineId);

    if (!this.imEngineDir.exists()) {
      throw new Error('KeyboardLayoutDetail: Keyboard layout ' + id + '.js' +
        ' specified a non-exist ime.');
    }
  }

  // Handle its dictionary declarations, and count the size, if any.
  var lang;
  switch (this.imEngineId) {
    case 'latin':
      this.preloadDictRequired = false;
      lang = win.Keyboards[id].autoCorrectLanguage;
      if (lang) {
        this.dictFilename = lang + '.dict';
        this.dictFilePath = 'dictionaries/' + this.dictFilename;
        this.dictFile = utils.getFile(appDir.path, 'js', 'imes', 'latin',
                                      'dictionaries', this.dictFilename);

        if (!this.dictFile.exists()) {
          throw new Error('KeyboardLayoutDetail: ' +
            'Keyboard layout ' + id + '.js' +
            ' specified a non-exist dictionary for latin engine.');
        }

        // Consider the file size of the layout as the size of the dinctionary.
        this.fileSize = this.dictFile.fileSize;
      } else {
        // To prevent this to be 0, set the size to it's layoutFile.
        this.fileSize = this.layoutFile.fileSize;
      }

      break;

    case 'handwriting':
    case 'jskanji':
    case 'jspinyin':
    case 'jszhuyin':
      // These IMs come with dictionary data in the tree. They must be
      // excluded in a "noPreloadDictRequired" build to conserve build size.
      this.preloadDictRequired = true;

      // The file size of the layout would be the size of the engine dir.
      this.fileSize = utils.ls(this.imEngineDir, true)
        .map(function(file) {
          return file.fileSize;
        })
        .reduceRight(function(prev, fileSize) {
          return prev + fileSize;
        }, 0);

      break;

    case 'jsavrophonetic':
    case 'jstelex':
    case 'india':
    case 'jshangul':
    case 'vietnamese':
      // These IMs only come with some logic in JavaScript with no preload
      // dictionaries -- we can safely include them w/o taking too much size.
      this.preloadDictRequired = false;

      // The file size of the layout would be the size of the engine dir.
      this.fileSize = utils.ls(this.imEngineDir, true)
        .map(function(file) {
          return file.fileSize;
        })
        .reduceRight(function(prev, fileSize) {
          return prev + fileSize;
        }, 0);

      break;

    default:
      // It's possible the layout doesn't have an IMEngine, and it's acceptible.
      // Other than that, throw so people are forced to place their IMEngine
      // correctly here.
      if (this.imEngineId) {
        throw new Error('KeyboardLayoutDetail: Found an unknown imEngine: "' +
          this.imEngineId + '".');
      }

      // To prevent this to be 0, set the size to it's layoutFile.
      this.fileSize = this.layoutFile.fileSize;

      // This is purposely left unset.
      this.preloadDictRequired = undefined;
  }
};

var KeyboardLayoutConfigurator = function(appDir) {
  this.appDir = appDir;
};

KeyboardLayoutConfigurator.prototype.loadLayouts =
function(enabledLayoutIds, downloadableLayoutIds) {
  var enabledLayoutIdSet = this._expandLayoutIdSet(enabledLayoutIds);
  var downloadableLayoutIdSet = this._expandLayoutIdSet(downloadableLayoutIds);

  utils.log('keyboard-load-layouts', 'The enabled layouts are set to: ' +
    [...enabledLayoutIdSet].join(', '));
  utils.log('keyboard-load-layouts', 'The downloadable layouts are set to: ' +
    [...downloadableLayoutIdSet].join(', '));

  if (enabledLayoutIdSet.size === 0) {
    throw new Error('KeyboardLayoutConfigurator: No layout specified?');
  }

  this.layoutDetails = [];

  // We need to track the dict separately here --
  // because we want to set all layouts using the same dictionary to be
  // considered preloaded.
  var imEngineDictIdSet = new Set();

  enabledLayoutIdSet.forEach(function(layoutId) {
    var detail = new KeyboardLayoutDetail(layoutId);
    detail.load(this.appDir);

    if (detail.dictFile) {
      imEngineDictIdSet.add(detail.imEngineId + '/' + detail.dictFilePath);
    }

    this.layoutDetails.push(detail);
  }, this);

  downloadableLayoutIdSet.forEach(function(layoutId) {
    if (enabledLayoutIdSet.has(layoutId)) {
      return;
    }

    var detail = new KeyboardLayoutDetail(layoutId);
    detail.load(this.appDir);

    this.layoutDetails.push(detail);
  }, this);

  this.layoutDetails.sort(function(a, b) {
    if (a.id > b.id) {
      return 1;
    } else if (a.id < b.id) {
      return -1;
    }

    throw new Error('KeyboardLayoutConfigurator: ' +
      'Found two identical layout id: ' + a.id);
  });

  this.layoutDetails.forEach(function(detail) {
    if (imEngineDictIdSet.has(detail.imEngineId + '/' + detail.dictFilePath)) {
      detail.dictPreloaded = true;
    }
  });
};

KeyboardLayoutConfigurator.prototype._expandLayoutIdSet = function(layoutIds) {
  var layoutIdSet = new Set(layoutIds);

  if (layoutIdSet.has('*')) {
    // Overwrite the set with all the layouts in the tree.
    layoutIdSet = new Set(this._listAllLayouts());
  } else if (layoutIdSet.has('noPreloadDictRequired')) {
    // Get all the layouts that does not require preload dictionary.
    this._listAllLayouts(function isPreloadDictNotRequired(detail) {
      return !detail.preloadDictRequired;
    }).forEach(function(layoutId) {
      layoutIdSet.add(layoutId);
    }, this);

    layoutIdSet.delete('noPreloadDictRequired');
  }

  layoutIdSet.delete('');

  return layoutIdSet;
};

KeyboardLayoutConfigurator.prototype._listAllLayouts = function(testFunc) {
  var layoutDir = utils.getFile(this.appDir.path, 'js', 'layouts');
  return utils.ls(layoutDir, false).map(function(file) {
    if (!file.leafName.endsWith('.js')) {
      return '';
    }

    return file.leafName.substr(0, file.leafName.length - 3);
  }).filter(function(layoutId) {
    if (!layoutId) {
      return false;
    }

    var detail = new KeyboardLayoutDetail(layoutId);
    detail.load(this.appDir);
    if (detail.noIncludeInExpandLayoutIdSet) {
      return false;
    }
    if (typeof testFunc === 'function' && !testFunc(detail)) {
      return false;
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
        if (!layoutDetail.dictPreloaded) {
          return;
        }

        utils.ensureFolderExists(dictDests.latin);
        layoutDetail.dictFile.copyTo(
          dictDests.latin, layoutDetail.dictFile.leafName);

        break;
    }
  }, this);
};

KeyboardLayoutConfigurator.prototype.getLayoutsJSON = function() {
  var layouts = [];

  this.layoutDetails.forEach(function(layoutDetail) {
    var layout = {
      id: layoutDetail.id,
      name: layoutDetail.label,
      imEngineId: layoutDetail.imEngineId,
      types: layoutDetail.types,
      dictFileSize: layoutDetail.fileSize
    };

    if (layoutDetail.dictFile) {
      layout.preloaded = layoutDetail.dictPreloaded;

      layout.dictFilename = layoutDetail.dictFilename;
      layout.dictFilePath = layoutDetail.dictFilePath;
    } else {
      layout.preloaded = true;
    }

    layouts.push(layout);
  });

  return layouts;
};

KeyboardLayoutConfigurator.prototype.addInputsToManifest = function(manifest) {
  this.layoutDetails.forEach(function(layoutDetail) {
    // Layout does not get declared statically
    // if its dictionary is not preloaded.
    if (layoutDetail.dictFile && !layoutDetail.dictPreloaded) {
      return;
    }

    manifest.inputs[layoutDetail.id] = {
      launch_path: '/index.html#' + layoutDetail.id,
      name: layoutDetail.label,
      description: layoutDetail.label,
      types: layoutDetail.types
    };
  });
};

exports.KeyboardLayoutConfigurator = KeyboardLayoutConfigurator;
