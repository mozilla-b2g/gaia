'use strict';

/* global require, exports */
const { Cc, Ci } = require('chrome');
var utils = require('utils');
var manager = require('homescreen-manager');
var ioService = Cc['@mozilla.org/network/io-service;1']
                  .getService(Ci.nsIIOService);

var CollectionAppBuilder = function() {
};

CollectionAppBuilder.prototype.execute = function(options) {
  var collections = manager.getCollections(options);

  var stageDir = utils.getFile(options.STAGE_APP_DIR);

  // Clean collections folder to remove unused collections.
  var collectionsFolder = utils.getFile(options.STAGE_APP_DIR, 'collections');
  collectionsFolder.remove(true);
  utils.ensureFolderExists(collectionsFolder);

  var gaia = utils.gaia.getInstance(options);
  var sourceDir = gaia.distributionDir ?
    gaia.distributionDir : options.GAIA_DIR;
  var collectionsToCopy = collections.collections;

  collectionsToCopy.forEach(function(collection){
    // Copy collection to stage dir
    var directory = collection.path[0];
    var appName = collection.path[1];
    var dir = utils.getFile(sourceDir, directory, appName);
    if (!dir.exists()) {
      dir = utils.getFile(options.GAIA_DIR, directory, appName);
    }

    dir.copyTo(collectionsFolder, null);

    var mainIcon = ioService.newURI(collection.icon, null, null).path;

    // Read manifest
    let manifestFile = dir.clone();
    manifestFile.append('manifest.collection');
    var manifest = utils.getJSON(manifestFile);

    // Remove unused icons
    var icons = manifest.icons;
    if (icons) {
      for (var iconSize in icons) {
        if (mainIcon != icons[iconSize]) {
          var iconFile = utils.getFile(options.STAGE_APP_DIR, icons[iconSize]);
          iconFile.remove(false);
        }
      }
    }

    // Rename the right icon, (removing the size suffix)
    var iconSuffixMatch = /_[0-9]+\.png$/;
    var correctIconFile = utils.getFile(options.STAGE_APP_DIR, mainIcon);
    var newName = correctIconFile.leafName.replace(iconSuffixMatch, '.png');
    correctIconFile.renameTo(null, newName);

    // Rename the collection icon.
    collection.icon = collection.icon.replace(iconSuffixMatch, '.png');

    // Remove unused backgrounds
    var backgrounds = manifest.backgrounds;
    if (backgrounds) {
      var mainBackground = ioService.newURI(collection.background,
                                            null, null).path;
      for (var backSize in backgrounds) {
        if (mainBackground != backgrounds[backSize]) {
          var backgroundFile = utils.getFile(options.STAGE_APP_DIR,
                                             backgrounds[backSize]);
          backgroundFile.remove(false);
        }
      }
    }

    collection.cName = collection.name.toLowerCase();
    delete collection.path;
  });

  var configFile = utils.getFile(stageDir.path, 'js',
                             'pre_installed_collections.json');
  utils.writeContent(configFile, JSON.stringify(collections));
};

exports.execute = function(options) {
  utils.copyToStage(options);
  (new CollectionAppBuilder()).execute(options);
};
