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
  if (config.ROCKETBAR != 1) {
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
    if (customize.swipe.threshold)
      swipe_threshold = customize.swipe.threshold;
    if (customize.swipe.friction)
      swipe_friction = customize.swipe.friction;
    if (customize.swipe.transition_duration)
      transition_duration = customize.swipe.transition_duration;
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
  if (config.ROCKETBAR == 1) {
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

  // SMS
  init = utils.getFile(config.GAIA_DIR, 'apps', 'sms', 'js', 'blacklist.json');
  let content = ['4850', '7000'];

  utils.writeContent(init,
    utils.getDistributionFileContent('sms-blacklist', content, distDir));

  // Active Sensors
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'settings', 'resources', 'sensors.json');
  content = { ambientLight: true };

  utils.writeContent(init,
    utils.getDistributionFileContent('sensors', content, distDir));

  // Support
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'settings', 'resources', 'support.json');
  content = null;

  utils.writeContent(init,
    utils.getDistributionFileContent('support', content, distDir));

  // Browser
  init = utils.getFile(config.GAIA_DIR, 'apps', 'browser', 'js', 'init.json');

  // bind mcc, mnc pair as key from
  // http://en.wikipedia.org/wiki/Mobile_country_code
  // the match sequence is Carrier + Nation > Carrier default > system default
  // key always with 6 digits, the default key is "000000"
  // mcc:3 digits
  // mnc:3 digits, fill with leading zeros, fill '000' in MNC to provide the
  // carrier default bookmark

  content = {
    '000000': {
      'bookmarks': [
        { 'title': 'Mozilla',
          'uri': 'http://mozilla.org',
          'iconUri':
            'data:image/png;base64,AAABAAIAEBAAAAEAIABoBAAAJgAAACAgAAABACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8AVVBO/1NOTv9UT07/VVBOAFVQTwBUT04AU05N/1ROTv9VT0//VVBPAFROTgBUT04AVE5O/1VQTv9VUE7/////AFVQTv9UTk7/VE5O/1NOTgBUTk4AVE9OAFRPTvdTTk7/VE5O/1NOTgBVUE4AU05OAFVQTv9UTk7/U05N/////wBTTk7/VE5O/1VQTv9VUE4AVVBOAFROTgBUT073VE5O/1ROTv9TTk4AVE5OAFROTgBVUE7/VE5O/1VQT/////8AVE5O/1VQTv9UTk7/VE5OAFRPTgBUTk4AVE9O91VQT/9UTk7/U05OAFRPTgBUT04AVE5O/1NOTv9UTk7/////AFROTv9UTk7/VVBP/1ROTgBUTk4AVE5OAFVQTvdUTk7/U05N/1NOTQBTTk4AU05OAFVPT/9TTk7/VE5O/////wBUTk7/VE9O/1ROTv9UTk4AVU9PAFVQTwBVT0/3VE9O/1ROTv9UTk4AVE9OAFNOTgBVUE7/U05O/1ROTv////8AVE9O/1VQT/9VUE//VE5OAFVQTgBUTk4AVE9O91ROTv9UTk7/VE5OAFNOTgBUTk4AVE5O/1NOTf9UTk7/////AFVQTv9UT07/U05N/1ROTgBVUE4AVE5OAFVQTutVUE7/VE9O/1NOTQBUT04AVVBOAFROTv9UTk7/VE9O/1ROTiFUTk7/VE5O/1NOTf9UTk4+////AP///wBUTk7/VVBO/1ROTv9UTk4+VE9OAFRPTgBTTk3/VE5O/1ROTv9UT05lU05O/1ROTv9VUE7/U05N/1VQToBUT06eU05O/1RPTv9UTk7/VE9O/1VPT51VT0+aVE5O/1ROTv9VT0//VE5Or1VQTv9UTk7/U05N/1ROTv9TTk7/VVBO/1NOTf9TTk7/U05N+VNOTv9UTk7/VVBP/1RPTv9VUE//U05OzP///wBUT07/U05N/1ROTo////8AVE9O/1RPTv9UTk7/VE5OqFROTgBVUE5hU05O/1VQTv9TTk7/VE9O31ROTgD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP//AAD//wAAjjgAAI44AACOOAAAjjgAAI44AACOOAAAjjgAAI44AACOOAAAgAAAAAAAAACIYQAA//8AAP//AAAoAAAAIAAAAEAAAAABACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wBTTk0AU05N/1NOTf9TTk3/U05N/1NOTf9TTk3wU05NAFNOTQBTTk0AU05NAFNOTQBTTk3BU05N/1NOTf9TTk3/U05N/1NOTf9TTk0AU05NAFNOTQBTTk0AU05NAFNOTfBTTk3/U05N/1NOTf9TTk3/U05N/////wD///8A////AFNOTQBTTk3/U05N/1NOTf9TTk3/U05N/1NOTfBTTk0AU05NAFNOTQBTTk0AU05NAFNOTbpTTk3/U05N/1NOTf9TTk3/U05N/1NOTQBTTk0AU05NAFNOTQBTTk0AU05N8FNOTf9TTk3/U05N/1NOTf9TTk3/////AP///wD///8AU05NAFNOTf9TTk3/U05N/1NOTf9TTk3/U05N8FNOTQBTTk0AU05NAFNOTQBTTk0AU05NulNOTf9TTk3/U05N/1NOTf9TTk3/U05NAFNOTQBTTk0AU05NAFNOTQBTTk3wU05N/1NOTf9TTk3/U05N/1NOTf////8A////AP///wBTTk0AU05N/1NOTf9TTk3/U05N/1NOTf9TTk3wU05NAFNOTQBTTk0AU05NAFNOTQBTTk26U05N/1NOTf9TTk3/U05N/1NOTf9TTk0AU05NAFNOTQBTTk0AU05NAFNOTfBTTk3/U05N/1NOTf9TTk3/U05N/////wD///8A////AFNOTQBTTk3/U05N/1NOTf9TTk3/U05N/1NOTfBTTk0AU05NAFNOTQBTTk0AU05NAFNOTbpTTk3/U05N/1NOTf9TTk3/U05N/1NOTQBTTk0AU05NAFNOTQBTTk0AU05N8FNOTf9TTk3/U05N/1NOTf9TTk3/////AP///wD///8AU05NAFNOTf9TTk3/U05N/1NOTf9TTk3/U05N8FNOTQBTTk0AU05NAFNOTQBTTk0AU05NulNOTf9TTk3/U05N/1NOTf9TTk3/U05NAFNOTQBTTk0AU05NAFNOTQBTTk3wU05N/1NOTf9TTk3/U05N/1NOTf////8A////AP///wBTTk0AU05N/1NOTf9TTk3/U05N/1NOTf9TTk3wU05NAFNOTQBTTk0AU05NAFNOTQBTTk26U05N/1NOTf9TTk3/U05N/1NOTf9TTk0AU05NAFNOTQBTTk0AU05NAFNOTfBTTk3/U05N/1NOTf9TTk3/U05N/////wD///8A////AFNOTQBTTk3/U05N/1NOTf9TTk3/U05N/1NOTfBTTk0AU05NAFNOTQBTTk0AU05NAFNOTbpTTk3/U05N/1NOTf9TTk3/U05N/1NOTQBTTk0AU05NAFNOTQBTTk0AU05N8FNOTf9TTk3/U05N/1NOTf9TTk3/////AP///wD///8AU05NAFNOTf9TTk3/U05N/1NOTf9TTk3/U05N8FNOTQBTTk0AU05NAFNOTQBTTk0AU05NulNOTf9TTk3/U05N/1NOTf9TTk3/U05NAFNOTQBTTk0AU05NAFNOTQBTTk3wU05N/1NOTf9TTk3/U05N/1NOTf////8A////AP///wBTTk0AU05N/1NOTf9TTk3/U05N/1NOTf9TTk3wU05NAFNOTQBTTk0AU05NAFNOTQBTTk26U05N/1NOTf9TTk3/U05N/1NOTf9TTk0AU05NAFNOTQBTTk0AU05NAFNOTfBTTk3/U05N/1NOTf9TTk3/U05N/////wD///8A////AFNOTQBTTk3/U05N/1NOTf9TTk3/U05N/1NOTfBTTk0AU05NAFNOTQBTTk0AU05NAFNOTbpTTk3/U05N/1NOTf9TTk3/U05N/1NOTQBTTk0AU05NAFNOTQBTTk0AU05N8FNOTf9TTk3/U05N/1NOTf9TTk3/////AP///wD///8AU05NAFNOTf9TTk3/U05N/1NOTf9TTk3/U05N8FNOTQBTTk0AU05NAFNOTQBTTk0AU05NulNOTf9TTk3/U05N/1NOTf9TTk3/U05NAFNOTQBTTk0AU05NAFNOTQBTTk3wU05N/1NOTf9TTk3/U05N/1NOTf////8A////AP///wBTTk0AU05N/1NOTf9TTk3/U05N/1NOTf9TTk3wU05NAFNOTQBTTk0AU05NAFNOTQBTTk26U05N/1NOTf9TTk3/U05N/1NOTf9TTk0AU05NAFNOTQBTTk0AU05NAFNOTfBTTk3/U05N/1NOTf9TTk3/U05N/////wD///8A////AFNOTQBTTk3/U05N/1NOTf9TTk3/U05N/1NOTfBTTk0AU05NAFNOTQBTTk0AU05NAFNOTbpTTk3/U05N/1NOTf9TTk3/U05N/1NOTQBTTk0AU05NAFNOTQBTTk0AU05N8FNOTf9TTk3/U05N/1NOTf9TTk3/////AP///wD///8AU05NAFNOTf9TTk3/U05N/1NOTf9TTk3/U05N8FNOTQBTTk0AU05NAFNOTQBTTk0AU05NulNOTf9TTk3/U05N/1NOTf9TTk3/U05NAFNOTQBTTk0AU05NAFNOTQBTTk3wU05N/1NOTf9TTk3/U05N/1NOTf////8A////AP///wBTTk0AU05N/1NOTf9TTk3/U05N/1NOTf9TTk32U05NAFNOTQBTTk0AU05NAFNOTQBTTk3LU05N/1NOTf9TTk3/U05N/1NOTf9TTk1WU05NAFNOTQBTTk0AU05NAFNOTfBTTk3/U05N/1NOTf9TTk3/U05N/////wD///8A////AFNOTQBTTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk32U05NkVNOTQBTTk0AU05NHFNOTftTTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk29U05NHFNOTQBTTk0cU05N+1NOTf9TTk3/U05N/1NOTf9TTk3/////AP///wD///8AU05NAFNOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/lNOTfBTTk3+U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N9lNOTf5TTk3/U05N/1NOTf9TTk3/U05N/1NOTfb///8A////AP///wBTTk1aU05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N3P///wD///8A////AFNOTahTTk3/U05N/1NOTf9TTk3/U05N/1NOTf5TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3bU05N21NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk12////AP///wD///8AU05NwVNOTftTTk3/U05N/1NOTf9TTk3/U05NHFNOTfBTTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05N3FNOTQBTTk0AU05NqVNOTf5TTk3/U05N/1NOTf9TTk3/U05N/1NOTf9TTk3/U05NqVNOTQD///8A////AP///wBTTk0AU05NAFNOTTlTTk29U05N51NOTdxTTk0AU05NAFNOTXZTTk3cU05N9lNOTf9TTk37U05N51NOTXVTTk0AU05NAFNOTQBTTk0AU05NOFNOTc9TTk32U05N/1NOTf9TTk3wU05Nz1NOTThTTk0AU05NAP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP//////////////////////////wPgfA8D4HwPA+B8DwPgfA8D4HwPA+B8DwPgfA8D4HwPA+B8DwPgfA8D4HwPA+B8DwPgfA8D4HwPA+B8DwPgfA8A4BwPAAAADwAAAA4AAAAeBAGAH8cH4H///////////////////////////'
        },
        { 'title': 'Firefox OS',
          'uri': 'http://mozilla.org/firefoxos',
          'iconUri':
            'data:image/png;base64,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'
        }
      ],
      'searchEngines' : [
        {
          'title': 'Google',
          'uri': 'http://www.google.com/search?q={searchTerms}',
          'iconUri':
            'data:image/png;base64,AAABAAIAEBAAAAEAIABoBAAAJgAAACAgAAABACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAAAEAAASCwAAEgsAAAAAAAAAAAAA9IVCSvSFQuf0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULk9IVCSvSFQub0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQuf0hUL/9IVC//SFQv/0hUL/9Y1O//rIq//+7+f//eXX//vUvf/7z7X/96Fu//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//vYwv/97OH/9ZRZ//SFQv/0hUL/9IhG//zbx//3om7/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/97uX/+buW//SFQv/0hUL/9IVC//SFQv/5upT/+9O6//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/+b6b//zezP/0iEf/9IVC//SFQv/1klf//ezh//vPtP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/3qXr/+siq//m8lv/5wqD//vTu//3t4//1klb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0h0b//vbx//zi0//1j1H/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/2nmn/+bmS/////v/4sIX/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/5uJH///v5//eoef/1jU//+82y//afav/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//vXw//vOs//0hUL/9IVC//ekcf/96+D/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//728v/4sIX/9IVC//SFQv/4s4n///v4//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/6yKn/+byX//SFQv/0hkT//eTV//vWv//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IZE//m6lP/5u5b//OHQ///+/f/6y6//96d3//SFQv/0hUL/9IVC//SFQv/0hULm9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULm9IVCSfSFQub0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULm9IVCSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAIAAAAEAAAAABACAAAAAAAAAQAAASCwAAEgsAAAAAAAAAAAAA9IVCAPSFQif0hUKt9IVC8vSFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQvL0hUKt9IVCJ/SFQgD0hUIo9IVC7/SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULv9IVCKPSFQq30hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUKt9IVC8fSFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQvP0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9YtL//i2jv/828f//vLr///7+P///Pv//vTu//3n2v/6zbH/96Nw//SFQ//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ekcv/+8+z////////////+9fD/+9K5//m9mf/4to7/+buV//vSuf/++PT//OPT//aYYP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/2l13///r3/////////fv/+b2Z//SIRv/0hUL/9IVC//SFQv/0hUL/9IVC//WNT//84M///vXv//aZYf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//vPtP////////////i0i//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//WQUv///Pr//OPU//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//eTV///////+9O7/9IVD//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//3m2P//////9ppi//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/718H///////3s4f/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//vDn///////4soj/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//erff////////38//WTWP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//iziv////////////iwhf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//rMsP///////eXW//WSVv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/4sYb///z7/////////Pv/9ZFV//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ixhv/+8Of//vn1//rMsP/4rH//9plh//WQUv/1j1L/+s2x//////////////////m9mf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SGQ//2nmn/+buW//vNsv/82sb//e3j/////////////////////v/5wZ//9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/83Mj////////////++fb/+K+C//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9ZRZ/////////////vTt//aaYv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/1lFr////////////6xqf/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ehbf/70bj//end//3o2////v3///////3l1//0iEb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/5wqD////////////96t7/96Z2//WOUP/2nWf//NvH//zcyP/1i0z/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/96l6/////////////vLr//WPUf/0hUL/9IVC//SFQv/0h0b//end//3k1f/0iUn/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/8387////////////4sYf/9IVC//SFQv/0hUL/9IVC//SFQv/6w6L///////nBn//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC///69////////vj1//SIR//0hUL/9IVC//SFQv/0hUL/9IVC//m+mv///////e3j//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL///r3///////8387/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/+syw///////++fb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/95NX///////vUvP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/97OH///////7y6//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//i2jv///////N/O//SFQv/0hUL/9IVC//SFQv/0hUL/96Nx////////////+s2x//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IdF//zh0P//+/j/9ZJW//SFQv/0hUL/9IVC//SKSv/96t7///////738v/1k1f/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9YxN//vUvf/96+D/96Z0//WNT//3om///ebY/////////Pv/+LKI//WVW//0h0X/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//agbP/7zbL//enc//749P////////////////////////////3r4P/3p3f/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULx9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC8/SFQq30hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUKt9IVCJ/SFQu/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC7/SFQif0hUIA9IVCJfSFQq30hULx9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC8fSFQq30hUIl9IVCAIAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAB'
        }
      ],
      'settings' : {
        'defaultSearchEngine': 'http://www.google.com/search?q={searchTerms}'
      }
    }
  };

  utils.writeContent(init,
    utils.getDistributionFileContent('browser', content, distDir));

  // Active Sensors
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'settings', 'resources', 'sensors.json');
  content = { ambientLight: true };

  utils.writeContent(init,
    utils.getDistributionFileContent('sensors', content, distDir));

  // Support
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'settings', 'resources', 'support.json');
  content = null;

  utils.writeContent(init,
    utils.getDistributionFileContent('support', content, distDir));

  // ICC / STK
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'system', 'resources', 'icc.json');
  content = {
    'defaultURL': 'http://www.mozilla.org/en-US/firefoxos/'
  };

  utils.writeContent(init,
    utils.getDistributionFileContent('icc', content, distDir));

  // WAP UA profile url
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'system', 'resources', 'wapuaprof.json');
  content = {};

  utils.writeContent(init,
    utils.getDistributionFileContent('wapuaprof.json', content, distDir));

  // WAP Push
  init = utils.getFile(config.GAIA_DIR, 'apps', 'wappush', 'js', 'whitelist.json');
  content = [];

  utils.writeContent(init,
    utils.getDistributionFileContent('wappush-whitelist', content));

  // Calendar Config
  init = utils.getFile(config.GAIA_DIR, 'apps', 'calendar', 'js', 'presets.js');
  content = {
    'google': {
      providerType: 'Caldav',
      group: 'remote',
      authenticationType: 'oauth2',
      apiCredentials: {
        tokenUrl: 'https://accounts.google.com/o/oauth2/token',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
        user_info: {
          url: 'https://www.googleapis.com/oauth2/v3/userinfo',
          field: 'email'
        },
        client_secret: 'jQTKlOhF-RclGaGJot3HIcVf',
        client_id: '605300196874-1ki833poa7uqabmh3hq' +
                   '6u1onlqlsi54h.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/calendar ' +
               'https://www.googleapis.com/auth/userinfo.email',
        redirect_uri: 'https://oauth.gaiamobile.org/authenticated'
      },
      options: {
        domain: 'https://apidata.googleusercontent.com',
        entrypoint: '/caldav/v2/',
        providerType: 'Caldav'
      }
    },

    'yahoo': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: 'https://caldav.calendar.yahoo.com',
        entrypoint: '/',
        providerType: 'Caldav',
        user: '@yahoo.com',
        usernameType: 'email'
      }
    },

    'caldav': {
      providerType: 'Caldav',
      group: 'remote',
      options: {
        domain: '',
        entrypoint: '',
        providerType: 'Caldav'
      }
    },

    'local': {
      singleUse: true,
      providerType: 'Local',
      group: 'local',
      options: {
        providerType: 'Local'
      }
    }
  };

  utils.writeContent(init, 'Calendar.Presets = ' +
               utils.getDistributionFileContent('calendar', content, distDir) +
               ';');

  // Communications config
  init = utils.getFile(config.GAIA_DIR,
    'apps', 'communications', 'contacts', 'config.json');
  content = {
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
      '// This file is automatically generated: DO NOT EDIT.\n' +
      '// To change these values, create a camera.json file in the\n' +
      '// distribution directory with content like this: \n' +
      '//   {\n' +
      '//     "maxImagePixelSize": 6000000,\n' +
      '//     "maxSnapshotPixelSize": 4000000 }\n' +
      '//   }\n' +
      'var CONFIG_MAX_IMAGE_PIXEL_SIZE = ' +
        customize.maxImagePixelSize + ';\n' +
      'var CONFIG_MAX_SNAPSHOT_PIXEL_SIZE = '
        + customize.maxSnapshotPixelSize + ';';

    let file = utils.getFile(config.GAIA_DIR, GAIA_CORE_APP_SRCDIR,
                             'camera', 'js', 'config.js');
    utils.writeContent(file, content);
    file = utils.getFile(config.GAIA_DIR, GAIA_CORE_APP_SRCDIR,
                         'gallery', 'js', 'config.js');
    utils.writeContent(file, content);
  }());

  // Configure the system keyboard app by copying the keyboard layouts and
  // autocorrect dictionary files we need into the app directory.
  require('keyboard-config').copyLayoutsAndResources(config);
}

exports.execute = execute;
exports.customizeHomescreen = customizeHomescreen;
