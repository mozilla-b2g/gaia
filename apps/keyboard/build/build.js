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
  this.preloadDictLayouts =
    options.GAIA_KEYBOARD_PRELOAD_DICT_LAYOUTS.split(',');
  this.userDictEnabled = options.GAIA_KEYBOARD_ENABLE_USER_DICT === '1';
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
                               'js/settings',
                               'js/shared',
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

KeyboardAppBuilder.prototype.buildDictionaryJSON = function() {
  var dictionariesObj = {};
  this.layoutConfigurator.layoutDetails.forEach(function(layoutDetail) {
    // Create a unique ID for each of the engine-dict pair so we don't
    // list one asset twice.
    var imEngineDictId;
    if (layoutDetail.imEngineId && layoutDetail.dictId) {
      imEngineDictId = layoutDetail.imEngineId + '::' + layoutDetail.dictId;
    } else {
      imEngineDictId = layoutDetail.id;
    }

    // Assumptions:
    // 1. If the imEngineDictId is the same, the data asset must be the same.
    // 2. All of the layoutDetail.dict* will return the same info.
    // 3. If |layoutDetail.options.preloadDictionary| is true for one layout,
    //    it is loaded for all layouts with the same dictId.
    //
    // These assumptions apply to current latin imEngine but it must apply
    // to other imEngines supporting downloading in the future.

    var dictObj = dictionariesObj[imEngineDictId];
    var dictLabel = layoutDetail.dictId ?
      layoutDetail.dictLabel :
      layoutDetail.label;

    if (!dictObj) {
      dictionariesObj[imEngineDictId] = dictObj = {
        label: dictLabel,
        id: imEngineDictId,
        inputIds: [ ]
      };
    } else {
      // Ensure all dictionaries have the same name in layouts.
      if (dictObj.label !== dictLabel) {
        throw new Error('KeyboardAppBuilder: ' +
          ' The same dictionary is named differently for id: ' +
          imEngineDictId +
          ', while processing layout id: ' +
          layoutDetail.id);
      }
    }

    dictObj.inputIds.push(layoutDetail.id);

    if (!layoutDetail.dictId) {
      dictObj.preload = true;
    } else {
      dictObj.preload =
        dictObj.preload || layoutDetail.options.preloadDictionary;

      dictObj.imEngineId = layoutDetail.imEngineId;
      dictObj.dictFilePath = layoutDetail.dictFilePath;
    }
  });

  return Object.keys(dictionariesObj).map(function(id) {
    dictionariesObj[id].inputIds.sort();

    return dictionariesObj[id];
  }).sort(function(a, b) {
    if (a.label > b.label) {
      return 1;
    }
    if (a.label < b.label) {
      return -1;
    }

    // This should never happen!
    throw new Error(
      'KeyboardAppBuilder: Found two identical dictionary label: ' + a.label);
  });
};

KeyboardAppBuilder.prototype.setDictDownloadableConfig = function() {
  // Write a dictionary list file into keyboard/js/settings/
  // This file is noly used in keyboard settings page.
  // (That's why we annotate latin.js too.)
  var configFileDesc = utils.getFile(
    this.distDir.path, 'js', 'settings', 'dictionaries.json');

  var dictionaries = this.buildDictionaryJSON();

  utils.writeContent(
    configFileDesc, JSON.stringify(dictionaries, null, 2));
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
  var enabledFeatures = {
    handwriting: settingsConfig.checkHandwriting(this.enabledLayouts),
    userDict: this.userDictEnabled
  };

  settingsConfig.addSettings(
    this.appDir.path, this.distDir.path, enabledFeatures);
};

KeyboardAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);

  this.layoutConfigurator =
    new KeyboardLayoutConfigurator(this.appDir);
  this.layoutConfigurator
    .loadLayouts(this.enabledLayouts, this.preloadDictLayouts);

  this.copyStaticFiles();
  this.copyLayouts();
  this.setDictDownloadableConfig();
  this.generateManifest();
  this.modifySettings();
};

exports.execute = function(options) {
  // We cannot export prototype functions out :(
  // so we run execute() this way.
  (new KeyboardAppBuilder()).execute(options);
};
