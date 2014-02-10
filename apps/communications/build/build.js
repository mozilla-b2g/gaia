'use strict';

/* global require, exports */
const utils = require('utils');
const { Cc, Ci } = require('chrome');

const APP_NAME = 'communications';
const DEBUG = false;

var CommAppBuilder = function() {
};

CommAppBuilder.prototype.APP_DIR = 'apps/' + APP_NAME;
CommAppBuilder.prototype.STAGE_DIR = 'build_stage/' + APP_NAME;

// set destination directory and application directory
CommAppBuilder.prototype.setOptions = function(options) {
  var stageDirPath = [options.GAIA_DIR].concat(this.STAGE_DIR.split('/'));
  this.stageDir = utils.getFile.apply(utils, stageDirPath);

  var appDirPath = [options.GAIA_DIR].concat(this.APP_DIR.split('/'));
  this.appDir = utils.getFile.apply(utils, appDirPath);

  this.webapp = utils.getWebapp(this.appDir.path, options.GAIA_DOMAIN,
    options.GAIA_SCHEME, options.GAIA_PORT);
  this.gaia = utils.getGaia(options);

  var content = JSON.parse(utils.getFileContent(utils.getFile(this.appDir.path,
    'build', 'communications_services.json')));
  var custom = utils.getDistributionFileContent('communications_services',
    content);
  this.commsServices = JSON.parse(custom);
  this.official = options.OFFICIAL;
};

CommAppBuilder.prototype.generateManifest = function() {
  var manifestObject;
  if (this.gaia.l10nManager) {
    manifestObject = this.gaia.l10nManager.localizeManifest(this.webapp);
  } else {
    var manifestContent = utils.getFileContent(this.webapp.manifestFile);
    manifestObject = JSON.parse(manifestContent);
  }

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
    var service = this.commsServices[from.split('_')[0] || from] ||
      this.commsServices;
    newRedirects.push({
      from: service[mappingParameters[from]],
      to: indexedRedirects[from]
    });
  }, this);

  manifestObject.redirects = newRedirects;

  var file = utils.getFile(this.stageDir.path, 'manifest.webapp');
  var args = DEBUG ? [manifestObject, undefined, 2] : [manifestObject];
  utils.writeContent(file, JSON.stringify.apply(JSON, args));
};

CommAppBuilder.prototype.generateContactsConfig = function() {
  var configFile = utils.getFile(this.stageDir.path, 'contacts', 'config.json');
  var defaultConfig = {
    'defaultContactsOrder': 'givenName',
    'facebookEnabled': true,
    'operationsTimeout': 25000,
    'logLevel': 'DEBUG',
    'facebookSyncPeriod': 24,
    'testToken': ''
  };
  utils.writeContent(configFile,
    utils.getDistributionFileContent('communications', defaultConfig,
    this.gaia.distributionDir));
};

CommAppBuilder.prototype.generateServicesConfig = function() {
  var commsServicesFile = utils.getFile(this.stageDir.path, 'contacts',
    'oauth2', 'js', 'parameters.js');

  // Bug 883344 Only use default facebook app id if is mozilla partner build
  if (this.official === '1') {
    this.commsServices.facebook.applicationId = '395559767228801';
    this.commsServices.live.applicationId = '00000000440F8B08';
  }

  var commsServices =
    utils.getDistributionFileContent('communications_services',
    this.commsServices, this.gaia.distributionDir);

  utils.writeContent(commsServicesFile,
    'var oauthflow = this.oauthflow || {}; oauthflow.params = ' +
    commsServices + ';');
};

CommAppBuilder.prototype.generateCustomizeResources = function() {
  if (!this.gaia.distributionDir) {
    return;
  }
  var variantFile = utils.getFile(this.gaia.distributionDir, 'variant.json');
  if (variantFile.exists()) {
    var resources = this.getSingleVariantResources(variantFile);

    var resourceDirFile = utils.getFile(this.stageDir.path, 'resources');
    utils.ensureFolderExists(resourceDirFile);
    var customizationFile = utils.getFile(this.stageDir.path,
      'resources', 'customization.json');
    utils.writeContent(customizationFile, JSON.stringify(resources.conf));

    resources.files.forEach(function(file) {
      if (file instanceof Ci.nsILocalFile) {
        file.copyTo(resourceDirFile, file.leafName);
      } else {
        var resourceFile = resourceDirFile.clone();
        resourceFile.append(file.filename);
        utils.writeContent(resourceFile, JSON.stringify(file.content));
      }
    });
  } else {
    utils.log(variantFile.path + ' not found. Single variant resources will' +
      ' not be added.\n');
  }
};

CommAppBuilder.prototype.getResource = function(path, resources, json, key) {
  var distDir = this.gaia.distributionDir;
  if (path) {
    var file = utils.getFile(distDir, path);
    if (!file.exists()) {
      throw new Error('Invalid single variant configuration: ' +
                      file.path + ' not found');
    }

    resources.push(file);
    json[key] = '/resources/' + file.leafName;
  }
};

CommAppBuilder.prototype.getSingleVariantResources = function(conf) {
  conf = utils.getJSON(conf);

  var output = {};
  var resources = [];
  conf.operators.forEach((function(operator) {
    var object = {};

    this.getResource(operator.wallpaper, resources, object, 'wallpaper');
    this.getResource(operator.default_contacts,
      resources, object, 'default_contacts');
    this.getResource(operator.support_contacts,
      resources, object, 'support_contacts');

    var ringtone = operator.ringtone;
    if (ringtone) {
      var ringtoneName = ringtone.name;
      if (!ringtoneName) {
        throw new Error('Missing name for ringtone in single variant conf.');
      }

      this.getResource(ringtone.path, resources, object, 'ringtone');
      if (!object.ringtone) {
        throw new Error('Missing path for ringtone in single variant conf.');
      }

      // Generate ringtone JSON
      var uuidGenerator = Cc['@mozilla.org/uuid-generator;1'].
                            createInstance(Ci.nsIUUIDGenerator);
      var ringtoneObj = { filename: uuidGenerator.generateUUID().toString() +
                                    '.json',
                          content: { uri: object.ringtone,
                                     name: ringtoneName }};

      resources.push(ringtoneObj);
      object.ringtone = '/resources/' + ringtoneObj.filename;
    }

    operator['mcc-mnc'].forEach(function(mcc) {
      if (Object.keys(object).length !== 0) {
        output[mcc] = object;
      }
    });
  }).bind(this));

  return {'conf': output, 'files': resources};
};

CommAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.generateManifest();
  this.generateContactsConfig();
  this.generateServicesConfig();
  this.generateCustomizeResources();
};

exports.execute = function(options) {
  (new CommAppBuilder()).execute(options);
};
