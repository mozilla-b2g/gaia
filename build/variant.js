var utils = require('./utils');
var applicationsData = require('./applications-data');
var downloadMgr = require('./download-manager').getDownloadManager();

const OUTPUT_FOLDER = 'temp';

const APPS_FOLDER = 'apps';
const APPS_DATA_FOLDER = 'cached';
const APPS_CONF_FOLDER = 'conf';
const APPS_CONF_FILENAME = 'singlevariantconf.json';

const PROFILE_APPS_FOLDER = 'svoperapps';

const MAX_ICONS_PER_PAGE = 4 * 4;
/**
 * the done flag to tell the console it is ready to exit.
 */
var done = false;
var errorObject = null;
/**
 * the count of current issued and unprocessed app requests.
 */
var appRequest = 0;

/*
* check and cut the path parts out from url
* if the url does not conform to {scheme}://{net_loc}/, this function returns
* null.
*/
function getOrigin(url) {
  if (!url) {
    return null;
  } else {
    var matched = url.match(/^([a-zA-Z]+:\/\/.[^/]+).*/);
    return (matched.length > 1) ? matched[1] : null;
  }
}

/*
* check if the downloaded app folder contains the following files:
* 1. metadata.json, 2. update.webapp, 3. application.zip, 4. manifest.webapp.
*/
function checkDownloadedApp(path) {
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
}


//download the packaged app from manifest['package_path'] to cache path.
function downloadPackageApp(manifest, metadata, appPath, callback, errCallback) {
  utils.log('variant.js',
            'download packaged app from: ' + manifest['package_path']);
  // write update.webapp
  utils.writeContentToFile(utils.joinPath(appPath, 'update.webapp'),
                           JSON.stringify(manifest));
  // write metadata.json
  utils.writeContentToFile(utils.joinPath(appPath, 'metadata.json'),
                           JSON.stringify(metadata));

  // download application
  downloadMgr.download(manifest['package_path'], appPath, 'application.zip',
                       callback, function err(url, path) {
                         errorCallback(new Error('unable to download: ' + url));
                       });
}

function prepareHostedApp(manifest, metadata, appPath, callback, errCallback) {
  // Bug 936028 - appcache needs to be removed from manifest
  if (manifest.appcache_path) {
    delete manifest.appcache_path;
  }

  // write manifest
  utils.writeContentToFile(utils.joinPath(appPath, 'manifest.webapp'),
                           JSON.stringify(manifest));
  // write metadata
  utils.writeContentToFile(utils.joinPath(appPath, 'metadata.json'),
                           JSON.stringify(metadata));
  callback();
}

function downloadApp(manifest, metadata, appPath, callback, errCallback) {
  // Determine if application is hosted or packaged and save manifest
  if (manifest['package_path']) { // packaged app
    downloadPackageApp(manifest, metadata, appPath, callback, errCallback);
  } else if (metadata.origin) { // hosted app
    prepareHostedApp(manifest, metadata, appPath, callback, errCallback);
  } else { // error case
    errCallback(new Error('installOrigin required for app ' + appId +
                    ' in local_apps.json configuration file'));
  }
}

function processApp(appId, manifestUrl, origin, installOrigin, profilePath,
                       appPath, cached, done) {

  // When everything is ready, we call this function to copy all files in
  // appPath to profilePath.
  function copyAppPathToProfile() {
    var destPath = utils.joinPath(profilePath, PROFILE_APPS_FOLDER);
    try {
      utils.copyFileTo(appPath, destPath, appId, true);
    } catch (ex) {
      utils.log('variant.js', 'copy file error: ' + ex.message);
      errorObject = ex;
    } finally {
      done();
    }
  }

  function handleError() {
    errorObject = new Error('failed to download manifest from ' +
                            manifestUrl);
    done();
  }

  utils.log('variant.js', 'downloading manifest: ' + manifestUrl);
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
      // update/manifest with downloaded content. If they are identical, we can
      // view them as the same. If not, we need to download and rebuild them.
      var updatePath = utils.joinPath(appPath, 'update.webapp');
      var manifestFile = utils.fileExists(updatePath) ?
                         'update.webapp' : 'manifest.webapp';
      var fileJSON = utils.readJSONFromPath(utils.joinPath(appPath,
                                                           manifestFile));

      // Bug 936028 - Comparation has to be done removing appcache
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
      metadata.origin = json['package_path'] ?
        getOrigin(json['package_path']) :
        (origin || getOrigin(json['launch_path']));
      downloadApp(json, metadata, appPath, copyAppPathToProfile, handleError);
    } catch (ex) {
      // error found
      errorObject = ex;
      done();
    }
  });
}

function fetchApps(data, profilePath, distributionPath, done) {
  utils.log('variant.js', 'fetch apps');
  var apps = data.apps;
  var distPath = utils.joinPath(distributionPath, OUTPUT_FOLDER, APPS_FOLDER,
                                APPS_DATA_FOLDER);
  var cachedApps = utils.listFiles(distPath, utils.FILE_TYPE_DIRECTORY, false);

  for (var app in apps) {
    var appManifest = apps[app];
    var appPath = utils.joinPath(distPath, app);
    var appCached = false;
    // check if the appPath already exists in cachedApp list
    cachedApps.every(function(cachedApp) {
      if (cachedApp.match(new RegExp('[\\\/]' + app + '$'))) {
        cachedApps.splice(cachedApps.indexOf(cachedApp), 1);
        //compare everything.
        if (checkDownloadedApp(appPath)) {
          utils.log('variant.js', app + ' is cached.');
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
    });
    var origin = apps[app].origin || null;
    var installOrigin = apps[app].installOrigin || null;

    appRequest++;
    processApp(app, apps[app].manifestURL, origin, installOrigin,
                  profilePath, appPath, appCached, function() {

      appRequest--;
      if (appRequest === 0) {
        // all apps are processed, clean all left cached apps, those are not
        // found with the app list.
        for (var i = 0; i < cachedApps.length; i++) {
          utils.log('variant.js', 'remove useless cache: ' + cachedApps[i]);
          utils.deleteFile(cachedApps[i], true);
        }
        done();
      }
    });
  }

}

// read the app postion customization part in variant.json and write the result
// to APPS_CONF_FILENAME.
function customizeAppPosition(data, profilePath, distributionPath) {
  utils.log('variant.js', 'fetch config');
  // generating metadata
  var apps = data.apps;
  var output = {};
  var outputHomescreen = {};
  data.operators.forEach(function(operator) {
    // Build an array with the apps for one operator and check if id is valid
    if (!operator.apps) {
      return;
    }
    var row = [];
    var rowHomescreen = [];
    operator.apps.forEach(function(app) {
      var appId = app.id;
      if (!apps[appId]) {
        throw new Error('Invalid application id: ' + appId);
      }
      row.push(appId);
      if (!apps[appId]['manifestURL']) {
        throw new Error('manifestURL not found for application: ' + appId);
      }
      app['manifestURL'] = apps[appId]['manifestURL'];
      delete app.id;
      rowHomescreen.push(app);
    });
    // For each mcc-mnc create an object with its apps array and add it to
    // output
    for (var i = 0; i < operator['mcc-mnc'].length; i++) {
      output[operator['mcc-mnc'][i]] = row;
      outputHomescreen[operator['mcc-mnc'][i]] = rowHomescreen;
    }
  });

  var profileFn = utils.joinPath(profilePath, PROFILE_APPS_FOLDER,
                                 APPS_CONF_FILENAME);

  utils.writeContentToFile(profileFn, JSON.stringify(output));
  var distFn = utils.joinPath(distributionPath, OUTPUT_FOLDER, APPS_FOLDER,
                              APPS_CONF_FOLDER, APPS_CONF_FILENAME);
  utils.writeContentToFile(distFn, JSON.stringify(outputHomescreen));
}

function validateHomescreen(data, config) {
  // Read init.json from homescreen to know homescreen layout
  var homescreen = null;
  try {
    homescreen = utils.readJSONFromPath(utils.joinPath(config.GAIA_DIR, 'apps',
                                        'homescreen', 'js', 'init.json'));
  } catch (e) {
    homescreen = applicationsData.customizeHomescreen(config);
  }

  // Custom comparation function used to sort apps by screen and location
  function compare(a, b) {
    if (a.screen < b.screen)
       return -1;
    if (a.screen > b.screen)
      return 1;
    if (a.location < b.location)
      return -1;
    if (a.location > b.location)
      return 1;
    return 0;
  }

  data.operators.forEach(function(operator) {
    var grid = JSON.parse(JSON.stringify(homescreen['grid']));
    var apps = [];
    // variable to hold apps with no location and screen, used to fill gaps
    var wildcardApps = [];
    operator.apps.forEach(function(app) {
      if(!app.id) {
        throw new Error('Missing id in some app');
      }

      // Check if screen and location both exists and are a number
      if ((typeof app.screen !==  'undefined' && typeof app.screen !== 'number') ||
           typeof app.screen !== typeof app.location) {
        throw new Error('Invalid app position for ' + app.id +
                        '. Missing location or screen property,' +
                        ' or properties are not a number');
      }

      if(app.screen) {
        apps.push(app);
      } else {
        wildcardApps.push(app);
      }
    });

    // sort list of apps with position by screen and location and validate position in
    // homescreen
    apps = apps.sort(compare);

    var screenLocations = [];
    apps.forEach(function(app) {
      var screen = grid[app.screen];
      if (!screen) {
        if (!(grid[app.screen - 1])) {
          throw new Error('Invalid screen position');
        }

        // Create new screen
        screen = [];
        grid.push(screen);
      }

      var screenLocation = parseInt(app.screen + '' + app.location);
      if (screenLocation in screenLocations) {
        throw new Error('Two applications are in the same position');
      }

      while (app.location > screen.length) {
        if (wildcardApps.length == 0) {
          throw new Error('Invalid position for app ' + app.id);
        }
        screen.push(wildcardApps.pop());
      }
      screen.splice(app.location, 0, app);
      screenLocations.push(screenLocation);
    });

    // Check if some screen has more apps than MAX_ICON_PER_PAGE
    var counter = 0;
    grid.forEach(function(screen) {
      if (screen.length > MAX_ICONS_PER_PAGE) {
        utils.log('variant.js', 'WARNING: More apps than ' + MAX_ICONS_PER_PAGE + ' in screen ' + counter);
      }
      counter++;
    });
  });
}

// main function
// the main flow of this module is:
// 1. read variants.json
// 2. validate variant.json and reorder index
// 3. download all apps.
//    3.1. download manifest
//    3.2. download packaged app if it is packaged
//    3.3. create manifest/update and metadata
// 4. customize layout with mcc-mnc.
function execute(options) {
  if (!options.PROFILE_DIR || !options.GAIA_DISTRIBUTION_DIR ||
      !options.VARIANT_PATH) {
    throw new Error('PROFILE_DIR, GAIA_DISTRIBUTION_DIR, VARIANT_PATH are all ' +
                  'required');
  }

  var profilePath = options.PROFILE_DIR;
  var distributionPath = options.GAIA_DISTRIBUTION_DIR;
  var appsFolder = utils.joinPath(distributionPath,
                                  OUTPUT_FOLDER,
                                  APPS_FOLDER);

  // create the temp folders.
  utils.mkdirs(utils.joinPath(appsFolder, APPS_DATA_FOLDER));
  // We should only remove temp/conf folder and recreate them.
  utils.deleteFile(utils.joinPath(appsFolder, APPS_CONF_FOLDER), true);
  utils.mkdirs(utils.joinPath(appsFolder, APPS_CONF_FOLDER));

  // clear profile folder
  utils.deleteFile(utils.joinPath(profilePath, PROFILE_APPS_FOLDER), true);
  utils.mkdirs(utils.joinPath(profilePath, PROFILE_APPS_FOLDER));

  // set done flag and start everything.
  done = false;
  // read variant.json
  var data = utils.readJSONFromPath(options.VARIANT_PATH);
  // validate variant.json
  validateHomescreen(data, options);
  // download all apps
  fetchApps(data, profilePath, distributionPath, function() {
    try {
      // customize layout with mcc-mnc.
      customizeAppPosition(data, profilePath, distributionPath);
    } catch (ex) {
      errorObject = ex;
    }
    done = true;
  });

  // Ensure everything is finished before exit this module
  utils.processEvents(function exitFunc() {
    return {'wait': !done,
            'error': errorObject};
  });
}

exports.execute = execute;
exports.downloadApp = downloadApp;
