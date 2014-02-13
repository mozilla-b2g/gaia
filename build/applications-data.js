'use strict';

var utils = require('./utils');
var webappManifests = require('./webapp-manifests');
var config;

const PREFERRED_ICON_SIZE = 60;
const GAIA_CORE_APP_SRCDIR = 'apps';
const GAIA_EXTERNAL_APP_SRCDIR = 'external-apps';
const INSTALL_TIME = 132333986000; // Match this to value in webapp-manifests.js

var webapps = {};

// Initial Homescreen icon descriptors.

// c.f. the corresponding implementation in the Homescreen app.
function bestMatchingIcon(preferred_size, manifest, origin) {
  var icons = manifest.icons;
  if (!icons) {
    return undefined;
  }

  var preferredSize = Number.MAX_VALUE;
  var max = 0;

  for (var size in icons) {
    size = parseInt(size, 10);
    if (size > max)
      max = size;

    if (size >= PREFERRED_ICON_SIZE && size < preferredSize)
      preferredSize = size;
  }
  // If there is an icon matching the preferred size, we return the result,
  // if there isn't, we will return the maximum available size.
  if (preferredSize === Number.MAX_VALUE)
    preferredSize = max;

  var url = icons[preferredSize];
  if (!url) {
    return undefined;
  }

  // If the icon path is not an absolute URL, prepend the app's origin.
  if (url.indexOf('data:') == 0 ||
      url.indexOf('app://') == 0 ||
      url.indexOf('http://') == 0 ||
      url.indexOf('https://') == 0)
    return url;

  return origin + url;
}

function getCollectionManifest(directory, app_name) {
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
}

function iconDescriptor(directory, app_name, entry_point) {
  let manifest = null;
  let origin = null;
  let manifestURL = null;

  manifest = getCollectionManifest(directory, app_name);
  if (!manifest) {
    if (!webapps[app_name]) {
      throw new Error(
        'Can not find application ' + app_name + ' at ' + directory
      );
    }

    manifest = webapps[app_name].manifest;
    if (entry_point &&
      manifest.entry_points &&
      manifest.entry_points[entry_point]) {
    manifest = manifest.entry_points[entry_point];
    }

    origin = webapps[app_name].webappsJson.origin;
    manifestURL = webapps[app_name].webappsJson.manifestURL;
  }

  let descriptor = {
    //TODO set localizedName once we know the default locale
    entry_point: entry_point,
    updateTime: INSTALL_TIME,
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
        let iconInfo = iconDescriptor.apply(null, app);
        app.splice(0, 2, iconInfo.manifestURL);
        apps.push(app);
      });
    }
    descriptor.apps = apps;
  }

  descriptor.manifestURL = manifestURL;
  descriptor.icon = bestMatchingIcon(PREFERRED_ICON_SIZE, manifest, origin);

  return descriptor;
}

function customizeHomescreen(options) {
  config = options;

  // zeroth grid page is the dock
  let customize = {
    'homescreens': [
      [
        ['apps', 'communications', 'dialer'],
        ['apps', 'sms'],
        ['apps', 'communications', 'contacts']
      ], [
        ['apps/homescreen/collections', 'social'],
        ['apps/homescreen/collections', 'games'],
        ['apps/homescreen/collections', 'music'],
        ['apps/homescreen/collections', 'showbiz']
      ], [
        ['apps', 'camera'],
        ['apps', 'gallery'],
        ['apps', 'fm'],
        ['apps', 'settings'],
        [GAIA_EXTERNAL_APP_SRCDIR, 'marketplace.firefox.com'],
        ['apps', 'calendar'],
        ['apps', 'clock'],
        ['apps', 'costcontrol'],
        ['apps', 'email'],
        ['apps', 'music'],
        ['apps', 'video']
      ]
    ],
    'search_page': {
      'enabled': true
    },
    'bookmarks': [
      {
        'name': 'Browser',
        'bookmarkURL': 'http://mozilla.org',
        'icon': 'app://homescreen.gaiamobile.org/style/icons/Aurora.png',
        'iconable': false,
        'useAsyncPanZoom': true,
        'features': 'toolbar=yes,location=yes',
        'removable': false
      }
    ]
  };

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
  // Default homescreen background
  let background_url = 'resources/images/backgrounds/default.png';

  if (customize.swipe) {
    if (customize.swipe.threshold)
      swipe_threshold = customize.swipe.threshold;
    if (customize.swipe.friction)
      swipe_friction = customize.swipe.friction;
    if (customize.swipe.transition_duration)
      transition_duration = customize.swipe.transition_duration;
  }

  if (customize.background) {
    background_url = customize.background.url || background_url;
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
        'bad homescreens.json, please remove collections when disabling search_page');
    }
  }

  var search_page_debug;
  try {
    let local_settings_file =
      utils.getFile(config.GAIA_DIR, GAIA_CORE_APP_SRCDIR,
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

    background: {
      url: background_url
    },

    grid: customize.homescreens.map(
      function map_homescreens(applist) {
        var output = [];
        for (var i = 0; i < applist.length; i++) {
          if (applist[i] !== null) {
            output.push(iconDescriptor.apply(null, applist[i]));
          }
        }
        return output;
      }
    )
  };

  // Only enable configurable bookmarks for dogfood devices
  if (config.ROCKETBAR !== 'none') {
    content.bookmarks = customize.bookmarks;
  }

  return content;
}

function execute(options) {
  webapps = webappManifests.execute(options);

  var distDir = options.GAIA_DISTRIBUTION_DIR;

  // Homescreen
  var homescreen = customizeHomescreen(options);
  let init = utils.getFile(config.GAIA_DIR, GAIA_CORE_APP_SRCDIR,
                      'homescreen', 'js', 'init.json');
  utils.writeContent(init, JSON.stringify(homescreen));

  // Communications config
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'communications', 'contacts', 'config.json');
  var content = {
    'defaultContactsOrder': 'givenName',
    'facebookEnabled': true,
    'operationsTimeout': 25000,
    'logLevel': 'DEBUG',
    'facebookSyncPeriod': 24,
    'testToken': ''
  };
  utils.writeContent(init,
    utils.getDistributionFileContent('communications', content, distDir));

  // Communications External Services
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'communications', 'contacts', 'oauth2', 'js', 'parameters.js');
  content = JSON.parse(utils.getFileContent(utils.getFile(config.GAIA_DIR,
                                            'build', 'config',
                                            'communications_services.json')));

  // Bug 883344 Only use default facebook app id if is mozilla partner build
  if (config.OFFICIAL === '1') {
    content.facebook.applicationId = '395559767228801';
    content.live.applicationId = '00000000440F8B08';
  }

  utils.writeContent(init,
    'var oauthflow = this.oauthflow || {}; oauthflow.params = ' +
    utils.getDistributionFileContent('communications_services', content,
    distDir) + ';');

  // Customize the maximum image size for Camera and Gallery
  (function customizeMaximumImageSize() {
    let defaultValue = {
      maxImagePixelSize: 5 * 1024 * 1024,
      maxSnapshotPixelSize: 5 * 1024 * 1024
    };
    let customize = JSON.parse(utils.getDistributionFileContent('camera',
                                                                defaultValue,
                                                                distDir));
    let content =
      '//\n' +
      '// This file is automatically generated: DO NOT EDIT.\n' +
      '// To change these values, create a camera.json file in the\n' +
      '// distribution directory with content like this: \n' +
      '//\n' +
      '//   {\n' +
      '//     "maxImagePixelSize": 6000000,\n' +
      '//     "maxSnapshotPixelSize": 4000000 }\n' +
      '//   }\n' +
      '//\n' +
      '// Optionally, you can also define variables to specify the\n' +
      '// minimum EXIF preview size that will be displayed as a\n' +
      '// full-screen preview by adding a property like this:\n' +
      '//\n' +
      '// "requiredEXIFPreviewSize": { "width": 640, "height": 480}\n' +
      '//\n' +
      '// If you do not specify this property then EXIF previews will only\n' +
      '// be used if they are big enough to fill the screen in either\n' +
      '// width or height in both landscape and portrait mode.\n' +
      '//\n' +
      'var CONFIG_MAX_IMAGE_PIXEL_SIZE = ' +
        customize.maxImagePixelSize + ';\n' +
      'var CONFIG_MAX_SNAPSHOT_PIXEL_SIZE = ' +
        customize.maxSnapshotPixelSize + ';\n';

    if (customize.requiredEXIFPreviewSize) {
      content +=
        'var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH = ' +
        customize.requiredEXIFPreviewSize.width + ';\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT = ' +
        customize.requiredEXIFPreviewSize.height + ';\n';
    }
    else {
      content +=
        'var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH = 0;\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT = 0;\n';
    }

    let file = utils.getFile(config.GAIA_DIR, GAIA_CORE_APP_SRCDIR,
                             'camera', 'js', 'config.js');
    utils.writeContent(file, content);
    file = utils.getFile(config.GAIA_DIR, GAIA_CORE_APP_SRCDIR,
                         'gallery', 'js', 'config.js');
    utils.writeContent(file, content);
  }());
}

exports.execute = execute;
exports.customizeHomescreen = customizeHomescreen;
