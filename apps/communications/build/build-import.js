'use strict';

/* global require, exports */
const utils = require('utils');

const DEBUG = false;

function getCommsServices(gaia) {
  var content = JSON.parse(utils.getFileContent(utils.getFile(
    gaia.sharedFolder.path, 'resources', 'communications_services.json')));
  var custom = utils.getDistributionFileContent('communications_services',
                                                                      content);
  return JSON.parse(custom);
}

function generateManifest (webapp, commsServices, gaia) {
  var manifestObject;
  var manifestContent = utils.getFileContent(webapp.manifestFile);
  manifestObject = JSON.parse(manifestContent);

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

  var file = utils.getFile(gaia.stageDir.path, 'manifest.webapp');
  var args = DEBUG ? [manifestObject, undefined, 2] : [manifestObject];
  utils.writeContent(file, JSON.stringify.apply(JSON, args));
}

function generateConfig (app, destination, gaia) {
  var configFile = utils.getFile(gaia.stageDir.path, destination,
                                'config.json');

  var defaultConfig = {
    'defaultContactsOrder': 'givenName',
    'facebookEnabled': true,
    'operationsTimeout': 25000,
    'logLevel': 'DEBUG',
    'facebookSyncPeriod': 24,
    'testToken': ''
  };
  utils.writeContent(configFile,
    utils.getDistributionFileContent(app, defaultConfig, gaia.distributionDir));
}

function generateServicesConfig(commServices, dest, official, gaia) {
  var commsServicesFile = utils.getFile(gaia.stageDir.path, 'shared',
    'pages', 'import', 'js', 'parameters.js');

  // Bug 883344 Only use default facebook app id if is mozilla partner build
  if (official === '1') {
    commServices.facebook.applicationId = '395559767228801';
    commServices.live.applicationId = '00000000440F8B08';
  }

  var commsServices =
    utils.getDistributionFileContent('communications_services',
      commServices, gaia.distributionDir);

  var jsPrefix =  'var oauthflow = this.oauthflow || {}; oauthflow.params = ';

  utils.writeContent(commsServicesFile, jsPrefix + commsServices + ';');

  if (dest) {
    utils.writeContent(dest, jsPrefix + commsServices + ';');
  }
}

exports.getCommsServices = getCommsServices;
exports.generateManifest = generateManifest;
exports.generateConfig = generateConfig;
exports.generateServicesConfig = generateServicesConfig;
