'use strict';

/* global require, exports */
var utils = require('utils');
var manifestModule = require('webapp-manifests');
var svoperapps = require('./homescreen-svoperapps');

var HomescreenAppBuilder = function() {
};

HomescreenAppBuilder.prototype.BASE_ICON_SIZE = 60;
HomescreenAppBuilder.prototype.GAIA_CORE_APP_SRCDIR = 'apps';
HomescreenAppBuilder.prototype.STAGE_DIR = 'build_stage/homescreen';
HomescreenAppBuilder.prototype.GAIA_EXTERNAL_APP_SRCDIR = 'external-apps';

HomescreenAppBuilder.prototype.setOptions = function(options) {
  var stageDirPath = [options.GAIA_DIR].concat(this.STAGE_DIR.split('/'));
  this.stageDir = utils.getFile.apply(utils, stageDirPath);

  let mappingFile = utils.getFile(options.GAIA_DIR, 'build_stage',
    'webapps-mapping.json');
  if (!mappingFile.exists()) {
    throw new Error('webapps mapping file not found, you should use' +
      ' webapp-manifests.js to create it first, path: ' + mappingFile.path);
  }
  this.webappsMapping = utils.getJSON(mappingFile);

  let defaultConfig = utils.getFile(utils.joinPath(options.GAIA_DIR,
    this.GAIA_CORE_APP_SRCDIR, 'homescreen', 'build',
    'default-homescreens.json'));
  this.defaultConfig = utils.getJSON(defaultConfig);

  this.preferredIconSize =
    this.BASE_ICON_SIZE * parseFloat(options.GAIA_DEV_PIXELS_PER_PX);

  this.options = options;
};

// c.f. the corresponding implementation in the Homescreen app.
HomescreenAppBuilder.prototype.bestMatchingIcon =
  function(preferred_size, manifest, origin) {
  var icons = manifest.icons;
  if (!icons) {
    return undefined;
  }

  var preferredIconSize = Number.MAX_VALUE;
  var max = 0;

  for (var size in icons) {
    size = parseInt(size, 10);
    if (size > max) {
      max = size;
    }

    if (size >= this.preferredIconSize && size < preferredIconSize) {
      preferredIconSize = size;
    }
  }
  // If there is an icon matching the preferred size, we return the result,
  // if there isn't, we will return the maximum available size.
  if (preferredIconSize === Number.MAX_VALUE) {
    preferredIconSize = max;
  }

  var url = icons[preferredIconSize];
  if (!url) {
    return undefined;
  }

  // If the icon path is not an absolute URL, prepend the app's origin.
  if (url.indexOf('data:') === 0 ||
      url.indexOf('app://') === 0 ||
      url.indexOf('http://') === 0 ||
      url.indexOf('https://') === 0) {
    return url;
  }

  return origin + url;
};

HomescreenAppBuilder.prototype.getCollectionManifest =
  function(directory, app_name) {
  var config = this.options;
  let gaia = utils.getGaia(config);

  // Locate the directory of a given app.
  // If the directory (Gaia.distributionDir)/(directory)/(app_name) exists,
  // favor it over (GAIA_DIR)/(directory)/(app_name).
  let targetDir = gaia.distributionDir ?
    gaia.distributionDir : config.GAIA_DIR;
  let dir = utils.getFile(targetDir, directory, app_name);

  if (!dir.exists()) {
    dir = utils.getFile(config.GAIA_DIR, directory, app_name);
  }

  let manifestFile = dir.clone();
  // Looking for a homescreen's collection
  manifestFile.append('manifest.collection');
  if (manifestFile.exists()) {
    return utils.getJSON(manifestFile);
  }

  return null;
};

HomescreenAppBuilder.prototype.getIconDiscriptorFromApp =
  function(directory, app_name, entry_point) {
  var config = this.options;
  let manifest = null;
  let origin = null;
  let manifestURL = null;

  manifest = this.getCollectionManifest(directory, app_name);
  if (!manifest) {
    if (!this.webappsMapping[app_name]) {
      throw new Error(
        'Can not find application ' + app_name + ' at ' + directory
      );
    }

    manifest = this.webappsMapping[app_name].originalManifest;
    if (entry_point &&
      manifest.entry_points &&
      manifest.entry_points[entry_point]) {
    manifest = manifest.entry_points[entry_point];
    }

    origin = this.webappsMapping[app_name].origin;
    manifestURL = this.webappsMapping[app_name].manifestURL;
  }

  let descriptor = {
    //TODO set localizedName once we know the default locale
    entry_point: entry_point,
    updateTime: manifestModule.INSTALL_TIME,
    name: manifest.name
  };

  if (manifest.role === 'collection') {
    origin = utils.gaiaOriginURL('homescreen', config.GAIA_SCHEME,
    config.GAIA_DOMAIN, config.GAIA_PORT);
    manifestURL = origin + '/collections/' + app_name + '/manifest.collection';
    descriptor.provider_id = manifest.provider_id;
    descriptor.role = manifest.role;
    descriptor.removable = true; // Collections are removable by default

    // Iterating local apps installed in the collection by default
    let apps = [];
    if (Array.isArray(manifest.apps)) {
      manifest.apps.forEach(function iterate(app) {
        let iconInfo = this.getIconDiscriptorFromApp.apply(this, app);
        app.splice(0, 2, iconInfo.manifestURL);
        apps.push(app);
      }, this);
    }
    descriptor.apps = apps;
  }

  descriptor.manifestURL = manifestURL;
  descriptor.icon = this.bestMatchingIcon(this.preferredIconSize, manifest,
    origin);

  return descriptor;
};

HomescreenAppBuilder.prototype.customizeHomescreen = function() {
  var config = this.options;

  let customize = this.defaultConfig;

  // Add the browser icon if rocketbar is not enabled
  if (config.ROCKETBAR !== 'full') {
    customize.homescreens[0].push(['apps', 'browser']);
  }

  if (config.DOGFOOD == 1) {
    customize.homescreens[0].push(['dogfood_apps', 'feedback']);
  }

  customize = JSON.parse(utils.getDistributionFileContent('homescreens',
    customize, config.GAIA_DISTRIBUTION_DIR));
  // keep e.me on by default
  let search_page_enabled = (customize.search_page) ?
                            customize.search_page.enabled : true;

  // It defines the threshold in milliseconds to move a collection while
  // dragging
  let move_collection_threshold = (customize.move_collection_threshold) ?
                                 customize.move_collection_threshold : 1500;
  // It defines the threshold in pixels to consider a gesture like a tap event
  let tap_threshold = (customize.tap_threshold) ? customize.tap_threshold : 10;
  // It defines the delay to show the blurring effect for clicked icons
  let tap_effect_delay = (customize.tap_effect_delay) ?
    customize.tap_effect_delay : 140;
  // It defines the threshold to consider a gesture like a swipe. Number
  // in the range 0.0 to 1.0, both included, representing the screen width
  let swipe_threshold = 0.4;
  // By default we define the virtual friction to .1 px/ms/ms
  let swipe_friction = 0.1;
  // Page transition duration defined in ms (300 ms by default)
  let transition_duration = 300;

  if (customize.swipe) {
    if (customize.swipe.threshold) {
      swipe_threshold = customize.swipe.threshold;
    }
    if (customize.swipe.friction) {
      swipe_friction = customize.swipe.friction;
    }
    if (customize.swipe.transition_duration) {
      transition_duration = customize.swipe.transition_duration;
    }
  }

  // if we disabled search_page
  if (!search_page_enabled) {
    let hasCollection = customize.homescreens.some(function(applist) {
      return applist.some(function(eachApp) {
        if (/collections$/.test(eachApp[0])) {
          return true;
        }
      });
    });

    // but we still have collections
    // then it means we have to take off them in build time.
    if (hasCollection) {
      throw new Error(
        'bad homescreens.json, please remove collections when disabling' +
        ' search_page');
    }
  }

  var search_page_debug;
  try {
    let local_settings_file =
      utils.getFile(config.GAIA_DIR, this.GAIA_CORE_APP_SRCDIR,
        'homescreen', 'everything.me', 'config', 'local.json');

    let local_settings = utils.getJSON(local_settings_file);
    search_page_debug = local_settings.debug;
  }
  catch(e) {
    search_page_debug = false;
  }

  let content = {
    search_page: {
      provider: 'EverythingME',
      debug: search_page_debug,
      separate_page: false,
      enabled: search_page_enabled
    },

    tap_threshold: tap_threshold,
    tap_effect_delay: tap_effect_delay,
    move_collection_threshold: move_collection_threshold,

    swipe: {
      threshold: swipe_threshold,
      friction: swipe_friction,
      transition_duration: transition_duration
    },

    // This specifies whether we optimize homescreen panning by trying to
    // predict where the user's finger will be in the future.
    prediction: {
      enabled: true,
      lookahead: 16  // 60fps = 16ms per frame
    },

    grid: customize.homescreens.map(
      function map_homescreens(applist) {
        var output = [];
        for (var i = 0; i < applist.length; i++) {
          if (applist[i] !== null) {
            output.push(this.getIconDiscriptorFromApp.apply(this, applist[i]));
          }
        }
        return output;
      }
    , this)
  };

  // Only enable configurable bookmarks for dogfood devices
  if (config.ROCKETBAR !== 'none') {
    content.bookmarks = customize.bookmarks;
  }

  return content;
};

HomescreenAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  var homescreen = this.customizeHomescreen();
  let configFile = utils.getFile(this.stageDir.path, 'js', 'init.json');
  utils.writeContent(configFile, JSON.stringify(homescreen));

  if (options.VARIANT_PATH) {
    svoperapps.execute(options, homescreen, this.stageDir);
  }
};

exports.execute = function(options) {
  (new HomescreenAppBuilder()).execute(options);
};
