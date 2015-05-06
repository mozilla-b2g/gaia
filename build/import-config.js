'use strict';

/**
 *  This module contains all the build time generation logic needed to
 *  use the import functionality both by the FTU and Comms Applications
 *
 *  The Functions exported by this module are used by the build scripts
 *  of Comms and FTU apps
 *
 */

var utils = require('utils');

// Returns the communications services configuration as a JS object
function getCommsServices(gaiaDir) {
  var content = JSON.parse(utils.getFileContent(utils.getFile(
    gaiaDir, 'build', 'config', 'communications_services.json')));
  var custom = utils.getDistributionFileContent('communications_services',
    content);
  return JSON.parse(custom);
}

// Generates a manifest object with the proper redirections established
// This manifest object will have to be serialized and persisted by the caller
function generateManifest (webapp, gaia) {
  var manifestObject;
  var manifestFile = utils.getFile(webapp.manifestFilePath);
  var manifestContent = utils.getFileContent(manifestFile);
  manifestObject = JSON.parse(manifestContent);
  var commsServices = getCommsServices(gaia.gaiaDir);

  var redirects = manifestObject.redirects;

  var indexedRedirects = {};
  redirects.forEach(function(aRedirect) {
    indexedRedirects[aRedirect.from] = aRedirect.to;
  });

  var mappingParameters = {
    'facebook': 'redirectURI',
    'live': 'redirectURI',
    'gmail': 'redirectURI',
    'facebook_dialogs': 'redirectMsg',
    'facebook_logout': 'redirectLogout'
  };

  var newRedirects = [];
  redirects.forEach(function(aRedirect) {
    var from = aRedirect.from;
    var service = commsServices[from.split('_')[0] || from] || commsServices;
    newRedirects.push({
      from: service[mappingParameters[from]],
      to: indexedRedirects[from]
    });
  });

  manifestObject.redirects = newRedirects;

  return manifestObject;
}

// Generates the configuration to be used by the importing processes
function generateConfig (app, destination, gaia) {
  var config = utils.getFile(gaia.stageDir.path, destination, 'config.json');
  var defaultConfig = {
    'defaultContactsOrder': 'givenName',
    'facebookEnabled': true,
    'operationsTimeout': 25000,
    'logLevel': 'DEBUG',
    'facebookSyncPeriod': 24,
    'testToken': '',
    'defaultImage': true
  };

  utils.writeContent(config, utils.getDistributionFileContent(app,
    defaultConfig, gaia.distributionDir));

  // Images configuration
  var imageConfig= utils.getFile(gaia.stageDir.path, '', 'config-images.json');
  var defaultImageConfig = {
    'thumbnail' : {
      'format': 'image/jpeg',
      'size': 65,
      'quality': 1.0
    }
  };

  utils.writeContent(imageConfig, utils.getDistributionFileContent(app,
    defaultImageConfig, gaia.distributionDir));
}

exports.generateManifest = generateManifest;
exports.generateConfig = generateConfig;
