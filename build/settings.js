'use strict';

var utils = require('./utils');
var config;
const { Cc, Ci, Cr, Cu, CC} = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');
let settings;

function readFileAsDataURL(file, mimetype, callback) {
  let XMLHttpRequest = CC('@mozilla.org/xmlextras/xmlhttprequest;1');
  let req = new XMLHttpRequest();
  let url = Services.io.newFileURI(file).spec;
  req.open('GET', url, false);
  req.responseType = 'blob';

  try {
    req.send(null);
  } catch (e) {
    dump('XMLHttpRequest.send error: ' + e + '\n');
  }

  // Convert the blob to a base64 encoded data URI
  let FileReader = CC('@mozilla.org/files/filereader;1');
  let reader = new FileReader();
  reader.onload = function() {
    let dataURL = reader.result;
    // There is a bug in XMLHttpRequest and file:// URL,
    // the mimetype ends up always being application/xml...
    dataURL = dataURL.replace('application/xml', mimetype);
    callback(dataURL);
  };
  reader.onerror = function() {
    dump('Unable to read file as data URL: ' + reader.error.name + '\n' +
         reader.error + '\n');
  };
  reader.readAsDataURL(req.response);
}

function setWallpaper(callback) {
  // Grab the default wallpaper and convert it into a base64 string
  let devpixels = '';
  if (config.GAIA_DEV_PIXELS_PER_PX != '1') {
    devpixels = '@' + config.GAIA_DEV_PIXELS_PER_PX + 'x';
  }

  let wallpaper = utils.resolve(
    config.GAIA_DISTRIBUTION_DIR + '/wallpapers/default' +
    devpixels + '.jpg', config.GAIA_DIR);

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      config.GAIA_DISTRIBUTION_DIR + '/wallpapers/default.jpg',
      config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      'build/wallpaper' + devpixels + '.jpg', config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve('build/wallpaper.jpg',
      config.GAIA_DIR);
  }

  readFileAsDataURL(wallpaper, 'image/jpeg', function(dataURL) {
    settings['wallpaper.image'] = dataURL;
    callback();
  });
}

function setRingtone(callback) {
  // Grab ringer_classic_courier.opus and convert it into a base64 string
  let ringtone_name = 'shared/resources/media/ringtones/' +
    'ringer_classic_courier.opus';
  let ringtone = utils.resolve(ringtone_name,
    config.GAIA_DIR);
  readFileAsDataURL(ringtone, 'audio/ogg', function(dataURL) {
    settings['dialer.ringtone'] = dataURL;
    callback();
  });
}

function setNotification(callback) {
  // Grab notifier_bell.opus and convert it into a base64 string
  let notification_name = 'shared/resources/media/notifications/' +
    'notifier_bell.opus';
  let notification = utils.resolve(notification_name,
    config.GAIA_DIR);
  readFileAsDataURL(notification, 'audio/ogg', function(dataURL) {
    settings['notification.ringtone'] = dataURL;
    callback();
  });
}

function overrideSettings() {
  // See if any override file exists and eventually override settings
  let override = utils.resolve(config.SETTINGS_PATH,
    config.GAIA_DIR);
  if (override.exists()) {
    let content = utils.getJSON(override);
    for (let key in content) {
      settings[key] = content[key];
    }
  }
}

function writeSettings() {
  // Finally write the settings file
  let settingsFile = utils.getFile(config.PROFILE_DIR, 'settings.json');
  let content = JSON.stringify(settings);
  utils.writeContent(settingsFile, content + '\n');
}

function execute(options) {
  config = options;
  var settingsFile = utils.getFile(config.GAIA_DIR, 'build',
    'common-settings.json');

  if (!settingsFile.exists()) {
    throw new Error('file not found: ' + settingsFile.path);
  }

  settings = utils.getJSON(settingsFile);

  if (config.TARGET_BUILD_VARIANT != 'user') {
    // We want the console to be disabled for device builds using the user variant.
    settings['debug.console.enabled'] = true;

    // Activate developer menu under the system menu when long pressing
    // the power button by default for devs.
    settings['developer.menu.enabled'] = true;

    // Turn on APZ for developers. The final activation for everything will
    // be done in bug 909877, but it will be good to get as many regressions
    // and bugs as possible before turning it on definitively.
    settings['apz.force-enable'] = true;
  }

  // Set the homescreen URL
  settings['homescreen.manifestURL'] = utils.gaiaManifestURL('homescreen',
    config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT);

  // Set the ftu manifest URL
  if (config.NOFTU === '0') {
    settings['ftu.manifestURL'] = utils.gaiaManifestURL('communications',
      config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT);
  }

  // Set the rocketbar URL
  settings['rocketbar.searchAppURL'] = utils.gaiaOriginURL('search',
    config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT) + '/index.html';

  if (config.PRODUCTION === '1') {
    settings['feedback.url'] = 'https://input.mozilla.org/api/v1/feedback/';
  }

  settings['language.current'] = config.GAIA_DEFAULT_LOCALE;
  settings['devtools.debugger.remote-enabled'] = config.REMOTE_DEBUGGER == true;

  if (config.DEVICE_DEBUG) {
    settings['devtools.debugger.remote-enabled'] = true;
    settings['screen.timeout'] = 0;
    settings['lockscreen.enabled'] = false;
    settings['lockscreen.locked'] = false;
  }



  // Run all asynchronous code before overwriting and writing settings file
  let done = false;
  setWallpaper(function() {
    setRingtone(function() {
      setNotification(function() {
        overrideSettings();
        writeSettings();
        done = true;
      });
    });
  });

  // Ensure not quitting xpcshell before all asynchronous code is done
  let thread = Services.tm.currentThread;
  while (thread.hasPendingEvents() || !done) {
    thread.processNextEvent(true);
  }
}
exports.execute = execute;
