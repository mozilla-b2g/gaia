'use strict';

var utils = require('./utils');

function setWallpaper(settings, config) {
  // Grab the default wallpaper and convert it into a base64 string
  let devpixels = '';
  if (config.GAIA_DEV_PIXELS_PER_PX != '1') {
    devpixels = '@' + config.GAIA_DEV_PIXELS_PER_PX + 'x';
  }

  let wallpaper = utils.resolve(
    utils.joinPath(config.GAIA_DISTRIBUTION_DIR, 'wallpapers',
      'default' + devpixels + '.jpg'), config.GAIA_DIR);

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      utils.joinPath(config.GAIA_DISTRIBUTION_DIR, 'wallpapers', 'default.jpg'),
      config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(
      utils.joinPath('build', 'config', 'wallpaper' + devpixels + '.jpg'),
      config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.resolve(utils.joinPath('build', 'config', 'wallpaper.jpg'),
      config.GAIA_DIR);
  }
  settings['wallpaper.image'] = utils.getFileAsDataURI(wallpaper);
}

function setRingtone(settings, config) {
  // Grab ringer_classic_courier.opus and convert it into a base64 string
  let ringtone_name = 'shared/resources/media/ringtones/' +
    'ringer_classic_courier.opus';
  let ringtone = utils.resolve(ringtone_name,
    config.GAIA_DIR);

  settings['dialer.ringtone'] = utils.getFileAsDataURI(ringtone);
}

function setNotification(settings, config) {
  // Grab notifier_bell.opus and convert it into a base64 string
  let notification_name = 'shared/resources/media/notifications/' +
    'notifier_bell.opus';
  let notification = utils.resolve(notification_name,
    config.GAIA_DIR);
  settings['notification.ringtone'] = utils.getFileAsDataURI(notification);
}

function overrideSettings(settings, config) {
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

function writeSettings(settings, config) {
  // Finally write the settings file
  let settingsFile = utils.getFile(config.PROFILE_DIR, 'settings.json');
  let content = JSON.stringify(settings);
  utils.writeContent(settingsFile, content + '\n');
}

function execute(config) {
  var settingsFile = utils.getFile(config.GAIA_DIR, 'build', 'config',
    'common-settings.json');

  if (!settingsFile.exists()) {
    throw new Error('file not found: ' + settingsFile.path);
  }

  var settings = utils.getJSON(settingsFile);

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

  if (config.ROCKETBAR) {
    settings['rocketbar.enabled'] = true;
  }

  settings['debugger.remote-mode'] = config.REMOTE_DEBUGGER ? 'adb-only'
                                                            : 'disabled';

  if (config.PRODUCTION === '1') {
    settings['feedback.url'] = 'https://input.mozilla.org/api/v1/feedback/';
    settings['debugger.remote-mode'] = 'disabled';
  }

  settings['language.current'] = config.GAIA_DEFAULT_LOCALE;

  if (config.DEVICE_DEBUG) {
    settings['debugger.remote-mode'] = 'adb-devtools';
  }

  if (config.NO_LOCK_SCREEN) {
    settings['screen.timeout'] = 0;
    settings['lockscreen.enabled'] = false;
    settings['lockscreen.locked'] = false;
  }

  // Run all asynchronous code before overwriting and writing settings file
  setWallpaper(settings, config);
  setRingtone(settings, config);
  setNotification(settings, config);
  overrideSettings(settings, config);
  writeSettings(settings, config);

  // Ensure not quitting xpcshell before all asynchronous code is done
  utils.processEvents(function(){return {wait : false}});
  return settings
}
exports.execute = execute;
exports.setWallpaper = setWallpaper;
exports.setRingtone = setRingtone;
exports.setNotification = setNotification;
exports.overrideSettings = overrideSettings;
exports.writeSettings = writeSettings;
