'use strict';

var utils = require('./utils');

var SvoperappsBuilder = function() {
};

SvoperappsBuilder.prototype.STAGE_SVOPERAPPS_FOLDER = '__svoperapps';
SvoperappsBuilder.prototype.APPS_DATA_FOLDER = 'cached';
SvoperappsBuilder.prototype.APPS_CONF_FOLDER = 'conf';
SvoperappsBuilder.prototype.PROFILE_APPS_FOLDER = 'svoperapps';
SvoperappsBuilder.prototype.APPS_CONF_FILENAME = 'singlevariantconf.json';
SvoperappsBuilder.prototype.DEFAULT_EMPTY_SCREENS = 2;
SvoperappsBuilder.prototype.MAX_ICONS_PER_PAGE = 4 * 4;

SvoperappsBuilder.prototype.errorObject = null;

/*
 * the count of current issued and unprocessed app requests.
 */
SvoperappsBuilder.prototype.appRequest = 0;

/*
 * check and cut the path parts out from url
 * if the url does not conform to {scheme}://{net_loc}/, this function returns
 * null.
 */
SvoperappsBuilder.prototype.getOrigin = function(url, defaultOrigin) {
  if (!url) {
    return null;
  } else {
    var matched = url.match(/^([a-zA-Z]+:\/\/.[^/]+).*/);
    return (matched && matched.length > 1) ? matched[1] : defaultOrigin;
  }
};

/*
 * check if the downloaded app folder contains the following files:
 * 1. metadata.json, 2. update.webapp, 3. application.zip, 4. manifest.webapp.
 */
SvoperappsBuilder.prototype.checkDownloadedApp = function(path) {
  var files = utils.listFiles(path, utils.FILE_TYPE_FILE, false);
  var metadataFound = false;
  var updateFound = false;
  var applicationFound = false;
  var manifestFound = false;

  for (var i = 0; i < files.length; i++) {
    if (files[i].match(/[\/\\]metadata\.json$/)) {
      metadataFound = true;
    } else if (files[i].match(/[\/\\]update\.webapp$/)) {
      updateFound = true;
    } else if (files[i].match(/[\/\\]application\.zip$/)) {
      applicationFound = true;
    } else if (files[i].match(/[\/\\]manifest\.webapp$/)) {
      manifestFound = true;
    }
  }
  return metadataFound && ((updateFound && applicationFound )|| manifestFound);
};

/*
 * Download the packaged app from manifest.package_path to cache path.
 */
SvoperappsBuilder.prototype.downloadPackageApp =
function(manifest, metadata, appPath, cb, errCb) {
  utils.log('svoperapps.js',
            'download packaged app from: ' + manifest.package_path);
  // write update.webapp
  utils.writeContent(utils.getFile(appPath, 'update.webapp'),
    JSON.stringify(manifest));
  // write metadata.json
  utils.writeContent(utils.getFile(appPath, 'metadata.json'),
    JSON.stringify(metadata));

  // download application
  var origin =  utils.getNewURI(metadata.manifestURL, null, null);
  var absolutePkgPath = origin.resolve(manifest.package_path);

  utils.download(absolutePkgPath, appPath + 'application.zip', cb,
    function err(url, path) {
      errCb(new Error('unable to download: ' + url));
    });
};

SvoperappsBuilder.prototype.prepareHostedApp =
function(manifest, metadata, appPath, callback, errCallback) {
  // Bug 936028 - appcache needs to be removed from manifest
  if (manifest.appcache_path) {
    delete manifest.appcache_path;
  }

  // write manifest
  utils.writeContent(utils.getFile(appPath, 'manifest.webapp'),
    JSON.stringify(manifest));
  // write metadata
  utils.writeContent(utils.getFile(appPath, 'metadata.json'),
    JSON.stringify(metadata));
  callback();
};

SvoperappsBuilder.prototype.downloadApp =
function(manifest, metadata, appPath, callback, errCallback) {
  // Determine if application is hosted or packaged and save manifest
  if (manifest.package_path) { // packaged app
    this.downloadPackageApp(manifest, metadata, appPath, callback, errCallback);
  } else if (metadata.origin) { // hosted app
    this.prepareHostedApp(manifest, metadata, appPath, callback, errCallback);
  } else { // error case
    errCallback(new Error('installOrigin required for app ' + manifest.name +
      ' in local_apps.json configuration file'));
  }
};

SvoperappsBuilder.prototype.processApp =
function(appId, manifestUrl, origin, installOrigin, appPath, cached, done) {
  var self = this;
  var destPath = utils.joinPath(this.profilePath, this.PROFILE_APPS_FOLDER);
  // When everything is ready, we call this function to copy all files in
  // appPath to profilePath.
  function copyAppPathToProfile() {
    try {
      utils.copyFileTo(appPath, destPath, appId);
    } catch (ex) {
      utils.log('svoperapps.js', 'copy file error: ' + ex.message);
      self.errorObject = ex;
    } finally {
      done();
    }
  }

  function handleError() {
    self.errorObject = new Error('failed to download manifest from ' +
      manifestUrl);
    done();
  }

  utils.log('svoperapps.js', 'downloading manifest: ' + manifestUrl);
  utils.downloadJSON(manifestUrl, function mandifestHandler(json) {
    if (!json) {
      if (cached) {
        // if json is not downloaded but we already had everything, just copy
        // it.
        copyAppPathToProfile();
      } else {
        handleError();
      }
      return;
    }
    // prepare the folders for this app
    utils.mkdirs(appPath);
    // if the app is cached, we need to compare the manifest file.
    if (cached) {
      // If we already have everything, we still need to compare the
      // update/manifest with downloaded content. If they are identical, we
      // can view them as the same. If not, we need to download and rebuild
      // them.
      var updatePath = utils.joinPath(appPath, 'update.webapp');
      var manifestFile = utils.fileExists(updatePath) ?
                         'update.webapp' : 'manifest.webapp';
      var fileJSON = utils.readJSONFromPath(utils.joinPath(appPath,
        manifestFile));

      // Bug 936028 - Comparation has to be done removing appcache + "\n");
      if (json.appcache_path) {
        delete json.appcache_path;
      }

      if (JSON.stringify(json) === JSON.stringify(fileJSON)) {
        copyAppPathToProfile();
        return;
      }
    }

    try {
      // if it is cached or the manifest file is not the same, we need to
      // download that app.
      var metadata = {
        'id': appId,
        'installOrigin': installOrigin,
        'manifestURL': manifestUrl
      };
      metadata.origin = json.package_path ?
        self.getOrigin(json.package_path, installOrigin) :
        (origin || self.getOrigin(json.launch_path));
      self.downloadApp(json, metadata, appPath,
        copyAppPathToProfile, handleError);
    } catch (ex) {
      // error found
      self.errorObject = ex;
      done();
    }
  });
};

SvoperappsBuilder.prototype.fetchApps = function(done) {
  utils.log('svoperapps.js', 'fetch apps');
  var apps = this.variant.apps;
  var distPath = utils.joinPath(this.svoperappsStagePath,
    this.APPS_DATA_FOLDER);
  var cachedApps = utils.listFiles(distPath, utils.FILE_TYPE_DIRECTORY, false);
  var self = this;

  function checkApp(cachedApp) {
    if (cachedApp.match(new RegExp('[\\\/]' + app + '$'))) {
      cachedApps.splice(cachedApps.indexOf(cachedApp), 1);
      //compare everything.
      if (self.checkDownloadedApp(appPath)) {
        utils.log('svoperapps.js', app + ' is cached.');
        // path exists and everything is ok, make it as cached
        appCached = true;
      } else {
        // path exists but some files are missing, mark it as not cached.
        appCached = false;
        utils.deleteFile(appPath, true);
      }
      return false;
    } else {
      return true;
    }
  }

  function processAppCallback() {
    self.appRequest--;
    if (self.appRequest === 0) {
      // all apps are processed, clean all left cached apps, those are not
      // found with the app list.
      for (var i = 0; i < cachedApps.length; i++) {
        utils.log('svoperapps.js', 'remove useless cache: ' + cachedApps[i]);
        utils.deleteFile(cachedApps[i], true);
      }
      done();
    }
  }

  for (var app in apps) {
    var appPath = utils.joinPath(distPath, app);
    var appCached = false;
    // check if the appPath already exists in cachedApp list
    cachedApps.every(checkApp);
    var origin = apps[app].origin || null;
    var installOrigin = apps[app].installOrigin || null;

    this.appRequest++;
    this.processApp(app, apps[app].manifestURL, origin, installOrigin,
      appPath, appCached, processAppCallback);
  }

  if (Object.keys(apps).length === 0) {
    done();
  }
};

SvoperappsBuilder.prototype.prepareDir = function() {
  var profilePath = this.options.PROFILE_DIR;
  var distributionPath = this.options.GAIA_DISTRIBUTION_DIR;
  var svoperappsStagePath = utils.joinPath(this.options.GAIA_DIR, 'build_stage',
    this.STAGE_SVOPERAPPS_FOLDER);
  utils.mkdirs(svoperappsStagePath);

  // create the temp folders.
  utils.mkdirs(utils.joinPath(svoperappsStagePath, this.APPS_DATA_FOLDER));

  // clear profile folder
  utils.deleteFile(utils.joinPath(profilePath, this.PROFILE_APPS_FOLDER), true);
  utils.mkdirs(utils.joinPath(profilePath, this.PROFILE_APPS_FOLDER));

  this.profilePath = profilePath;
  this.distributionPath = distributionPath;
  this.svoperappsStagePath = svoperappsStagePath;
};

SvoperappsBuilder.prototype.setOptions = function(options) {
  this.options = options;
  this.variant = utils.readJSONFromPath(options.VARIANT_PATH);
};

SvoperappsBuilder.prototype.generateConfig = function() {
  var file = utils.getFile(this.options.PROFILE_DIR, this.PROFILE_APPS_FOLDER,
    this.APPS_CONF_FILENAME);
  var config = {};
  if (this.variant.operators) {
    this.variant.operators.forEach(function(operator) {
      var apps = operator.apps.map(function(app) {
        return app.id;
      });
      operator['mcc-mnc'].forEach(function(mccmnc) {
        config[mccmnc] = apps;
      });
    });
  }
  utils.writeContent(file, JSON.stringify(config));
};

SvoperappsBuilder.prototype.execute = function(options) {
  if (!options.PROFILE_DIR || !options.GAIA_DISTRIBUTION_DIR ||
      !options.VARIANT_PATH) {
    utils.log('svoperapps.js', 'PROFILE_DIR, GAIA_DISTRIBUTION_DIR,' +
      ' VARIANT_PATH are all required');
    return;
  }

  this.setOptions(options);
  this.prepareDir();
  this.generateConfig();

  // set done flag and start everything.
  var done = false;
  // read variant.json
  // download all apps
  this.fetchApps(function() {
    done = true;
  });

  // Ensure everything is finished before exit this module
  utils.processEvents(function exitFunc() {
    return {
      'wait': !done,
      'error': this.errorObject
    };
  }.bind(this));
};

exports.execute = function(options) {
  (new SvoperappsBuilder()).execute(options);
};
