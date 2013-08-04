'use strict';

const PREFERRED_ICON_SIZE = 60;
const GAIA_CORE_APP_SRCDIR = 'apps';
const GAIA_EXTERNAL_APP_SRCDIR = 'external-apps';
const INSTALL_TIME = 132333986000; // Match this to value in webapp-manifests.js

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

function iconDescriptor(directory, app_name, entry_point) {
  let origin = gaiaOriginURL(app_name);
  let manifestURL = gaiaManifestURL(app_name);

  // Locate the directory of a given app.
  // If the directory (Gaia.distributionDir)/(directory)/(app_name) exists,
  // favor it over (GAIA_DIR)/(directory)/(app_name).
  let targetDir = Gaia.distributionDir ? Gaia.distributionDir : GAIA_DIR;
  let dir = getFile(targetDir, directory, app_name);

  if (!dir.exists()) {
    dir = getFile(GAIA_DIR, directory, app_name);
  }

  // For external/3rd party apps that don't use the Gaia domain, we have an
  // 'metadata.json' file that specifies the URL.
  let metadataFile = dir.clone();
  metadataFile.append('metadata.json');
  if (metadataFile.exists()) {
    let metadata = getJSON(metadataFile);
    origin = metadata.origin.replace(/^\s+|\s+$/, '');
    manifestURL = metadata.manifestURL;
    if (manifestURL) {
      manifestURL = manifestURL.replace(/^\s+|\s+$/, '');
    } else if (origin.slice(-1) == '/') {
      manifestURL = origin + 'manifest.webapp';
    } else {
      manifestURL = origin + '/manifest.webapp';
    }
  }

  let manifestFile = dir.clone();
  manifestFile.append('manifest.webapp');
  let manifest;
  if (manifestFile.exists()) {
    manifest = getJSON(manifestFile);
  } else {
    manifestFile = dir.clone();
    manifestFile.append('update.webapp');
    dump('Looking for packaged app: ' + manifestFile.path + '\n');
    manifest = getJSON(manifestFile);
  }

  if (entry_point &&
      manifest.entry_points &&
      manifest.entry_points[entry_point]) {
    manifest = manifest.entry_points[entry_point];
  }
  let icon = bestMatchingIcon(PREFERRED_ICON_SIZE, manifest, origin);

  //TODO set localizedName once we know the default locale
  return {
    manifestURL: manifestURL,
    entry_point: entry_point,
    updateTime: INSTALL_TIME,
    name: manifest.name,
    icon: icon
  };
}

// zeroth grid page is the dock
let customize = {'homescreens': [
  [
    ['apps', 'communications', 'dialer'],
    ['apps', 'sms'],
    ['apps', 'communications', 'contacts'],
    ['apps', 'browser']
  ], [
    ['apps', 'camera'],
    ['apps', 'gallery'],
    ['apps', 'fm'],
    ['apps', 'settings'],
    [GAIA_EXTERNAL_APP_SRCDIR, 'marketplace.firefox.com']
  ], [
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
  }
};

if (DOGFOOD == 1) {
  customize.homescreens[0].push(['dogfood_apps', 'feedback']);
}

customize = JSON.parse(getDistributionFileContent('homescreens', customize));
// keep e.me on by default
let search_page_enabled = (customize.search_page) ?
                          customize.search_page.enabled : true;

// It defines the threshold in pixels to consider a gesture like a tap event
let tap_threshold = (customize.tap_threshold) ? customize.tap_threshold : 10;
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

let content = {
  search_page: {
    provider: 'EverythingME',
    separate_page: false,
    enabled: search_page_enabled
  },

  tap_threshold: tap_threshold,

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

let init = getFile(GAIA_DIR, GAIA_CORE_APP_SRCDIR,
                  'homescreen', 'js', 'init.json');
writeContent(init, JSON.stringify(content));

// SMS
init = getFile(GAIA_DIR, 'apps', 'sms', 'js', 'blacklist.json');
content = ['4850', '7000'];

writeContent(init, getDistributionFileContent('sms-blacklist', content));

// Browser
init = getFile(GAIA_DIR, 'apps', 'browser', 'js', 'init.json');

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
    ]
  }
};

writeContent(init, getDistributionFileContent('browser', content));

// Active Sensors
init = getFile(GAIA_DIR, 'apps', 'settings', 'resources', 'sensors.json');
content = { ambientLight: true };

writeContent(init, getDistributionFileContent('sensors', content));

// Support
init = getFile(GAIA_DIR, 'apps', 'settings', 'resources', 'support.json');
content = null;

writeContent(init, getDistributionFileContent('support', content));

// ICC / STK
init = getFile(GAIA_DIR, 'apps', 'system', 'resources', 'icc.json');
content = {
  'defaultURL': 'http://www.mozilla.org/en-US/firefoxos/'
};

writeContent(init, getDistributionFileContent('icc', content));

// WAP UA profile url
init = getFile(GAIA_DIR, 'apps', 'system', 'resources', 'wapuaprof.json');
content = {};

writeContent(init, getDistributionFileContent('wapuaprof.json', content));

// Calendar Config
init = getFile(GAIA_DIR, 'apps', 'calendar', 'js', 'presets.js');
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

writeContent(init, 'Calendar.Presets = ' +
             getDistributionFileContent('calendar', content) + ';');

// Communications config
init = getFile(GAIA_DIR, 'apps', 'communications', 'contacts', 'config.json');
content = {
  'defaultContactsOrder': 'givenName',
  'facebookEnabled': true,
  'operationsTimeout': 25000,
  'logLevel': 'DEBUG',
  'facebookSyncPeriod': 24,
  'testToken': ''
};
writeContent(init, getDistributionFileContent('communications', content));

// Communications External Services
init = getFile(GAIA_DIR, 'apps', 'communications', 'contacts', 'oauth2', 'js',
               'parameters.js');
content = JSON.parse(getFileContent(getFile(GAIA_DIR, 'build',
                                       'communications_services.json')));

// Bug 883344 Only use default facebook app id if is mozilla partner build
if (OFFICIAL === '1') {
  content.facebook.applicationId = '395559767228801';
  content.live.applicationId = '00000000440F8B08';
}

writeContent(init, 'var oauthflow = this.oauthflow || {}; oauthflow.params = ' +
  getDistributionFileContent('communications_services', content) + ';');
