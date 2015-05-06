'use strict';

/**
 * Generate webapps_shared.json in stage folder and uuid.json for external apps
 */

var utils = require('./utils');

const UUID_FILENAME = 'uuid.json';

var ManifestBuilder = function() {
  this.INSTALL_TIME = Date.now();
  this.UPDATE_TIME = Date.now();
};

ManifestBuilder.prototype.setConfig = function(config) {
  this.id = 1;
  this.config = config;
  this.errors = [];
  this.gaia = utils.gaia.getInstance(this.config);
  this.stageManifests = {};
  this.manifests = {};
  this.webapps = {};
  this.stageDir = this.gaia.stageDir;
  utils.ensureFolderExists(this.stageDir);
};

ManifestBuilder.prototype.genStageWebappJSON = function() {
  var manifestFile = utils.getFile(this.stageDir.path, 'webapps_stage.json');
  utils.writeContent(manifestFile,
    JSON.stringify(this.stageManifests, null, 2) + '\n');
};

ManifestBuilder.prototype.genUuidJSON = function() {
  var uuidFile = utils.getFile(this.stageDir.path, UUID_FILENAME);
  utils.writeContent(uuidFile,
    JSON.stringify(utils.getUUIDMapping(this.config), null, 2) + '\n');
};

ManifestBuilder.prototype.fillExternalAppManifest = function(webapp) {
  var isPackaged = false;
  if (webapp.pckManifest) {
    isPackaged = true;
    if (webapp.metaData.origin) {
      this.errors.push('External webapp `' + webapp.sourceDirectoryName +
        '` can not have origin in metadata because is packaged');
      return;
    }
  }

  var profileDirectoryFile = utils.getFile(webapp.profileDirectoryFilePath);
  var webappTargetDirName = profileDirectoryFile.leafName;

  var origin = isPackaged ? 'app://' + webappTargetDirName :
               webapp.metaData.origin;
  if (!origin) {
    origin = 'app://' + webappTargetDirName;
  }

  if (!this.checkOrigin(origin)) {
    this.errors.push('External webapp `' + webapp.domain + '` has an invalid ' +
                'origin: ' + origin);
    return;
  }

  var installOrigin = webapp.metaData.installOrigin || origin;
  if (!this.checkOrigin(installOrigin)) {
    this.errors.push('External webapp `' + webapp.domain + '` has an invalid ' +
                'installOrigin: ' + installOrigin);
    return;
  }

  var manifestURL = webapp.metaData.manifestURL;
  if (!manifestURL) {
    this.errors.push('External webapp `' + webapp.domain +
                  '` does not have the mandatory manifestURL property.');
    return;
  }
  var manifestURI;
  try {
    manifestURI = utils.getNewURI(manifestURL);
  } catch (e) {
    var msg = 'Error ' + e.name + ' while parsing manifestURL for webapp ' +
               webapp.domain + ': ' + manifestURL;
    if (e.name === 'NS_ERROR_MALFORMED_URI') {
      msg += '\n    Is it an absolute URL?';
    }

    this.errors.push(msg);
    return;
  }

  if (manifestURI.scheme === 'app') {
    utils.log('Warning: external webapp `' + webapp.domain +
              '` has a manifestURL ' +
              'with an app:// scheme, which makes it non-updatable.\n');
  }

  var removable = ('removable' in webapp.metaData) ?
                  !!webapp.metaData.removable : true;

  var etag = webapp.metaData.etag || null;
  var packageEtag = webapp.metaData.packageEtag || null;
  this.stageManifests[webapp.sourceDirectoryName] = {
    originalManifest: webapp.manifest,
    origin: origin,
    manifestURL: manifestURL,
    installOrigin: installOrigin,
    receipt: null,
    installTime: this.INSTALL_TIME,
    updateTime: this.UPDATE_TIME,
    removable: removable,
    localId: this.id++,
    etag: etag,
    packageEtag: packageEtag,
    appStatus: webapp.appStatus,
    webappTargetDirName: webappTargetDirName
  };
};

ManifestBuilder.prototype.checkOrigin = function(origin) {
  try {
    return (utils.getNewURI(origin).prePath === origin);
  } catch (e) {
    return false;
  }
};

ManifestBuilder.prototype.fillAppManifest = function(webapp) {
  var origin = webapp.url;

  var installOrigin = origin;
  if (webapp.metadata && webapp.metadata.installOrigin) {
    installOrigin = webapp.metadata.installOrigin;
  }

  this.stageManifests[webapp.sourceDirectoryName] = {
    originalManifest: webapp.manifest,
    origin: origin,
    manifestURL: origin + '/manifest.webapp',
    installOrigin: installOrigin,
    receipt: null,
    installTime: this.INSTALL_TIME,
    updateTime: this.UPDATE_TIME,
    localId: this.id++,
    appStatus: webapp.appStatus,
    webappTargetDirName: webapp.domain
  };
};

ManifestBuilder.prototype.genManifest = function(webapp) {
  if (utils.isExternalApp(webapp)) {
    this.fillExternalAppManifest(webapp);
  } else {
    this.fillAppManifest(webapp);
  }
};

ManifestBuilder.prototype.manifestErrorSummary = function() {
  if (this.errors.length === 0) {
    return;
  }

  var introMessage = 'We got ' + this.errors.length + ' manifest error' +
    ((this.errors.length > 1) ? 's' : '') + ' while building:';
  this.errors.unshift(introMessage);
  var message = this.errors.join('\n * ') + '\n';
  throw new Error(message);
};

ManifestBuilder.prototype.execute = function(config) {
  this.setConfig(config);
  this.gaia.webapps.forEach(this.genManifest, this);
  this.manifestErrorSummary();
  this.genStageWebappJSON();
  this.genUuidJSON();
};

exports.execute = function(config) {
  (new ManifestBuilder()).execute(config);
};

exports.ManifestBuilder = ManifestBuilder;
