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

/* Setup the default keyboard layouts according to the current language */
function setDefaultKeyboardLayouts(lang, settings, config) {
  let layoutConfigFile = utils.resolve(
    utils.joinPath('shared', 'resources', 'keyboard_layouts.json'),
    config.GAIA_DIR);

  let layoutConfig = utils.getJSON(layoutConfigFile);
  let keyboardLayouts = layoutConfig['layout'];

  if (!keyboardLayouts) {
    utils.log('default keyboard layouts are not defined: ' +
              layoutConfigFile.path + '\n');
    return;
  }

  // Get the default layouts for the specified language
  let defaultLayoutList = keyboardLayouts[lang];
  if (!defaultLayoutList) {
    utils.log('Cannot find default layout list for language: ' + lang + '\n');
    defaultLayoutList = keyboardLayouts['en-US'];
  }

  let keyboardSettings = {};

  function addLayoutEntry(layout) {
    let manifestURL = layout.appManifestURL;

    if (!keyboardSettings[manifestURL]) {
      keyboardSettings[manifestURL] = {};
    }

    keyboardSettings[manifestURL][layout.layoutId] = true;
  }

  defaultLayoutList.forEach(addLayoutEntry);

  // Also add language-independent layouts into the sets
  let langIndependentLayoutList = layoutConfig['langIndependentLayouts'];
  langIndependentLayoutList.forEach(addLayoutEntry);

  settings['keyboard.enabled-layouts'] = keyboardSettings;
  settings['keyboard.default-layouts'] = keyboardSettings;
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

  // Set the ftu ping URL -- we set this regardless of NOFTU for now
  settings['ftu.pingURL'] = config.FTU_PING_URL;

  // Set the rocketbar URL
  settings['rocketbar.searchAppURL'] = utils.gaiaOriginURL('search',
    config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT) + '/index.html';

  if (config.ROCKETBAR && config.ROCKETBAR !== 'none') {
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

  setDefaultKeyboardLayouts(config.GAIA_DEFAULT_LOCALE, settings, config);

  // Ensure not quitting xpcshell before all asynchronous code is done
  utils.processEvents(function(){return {wait : false}});
  var queue = utils.Q.defer();
  queue.resolve();

  var result = queue.promise.then(function() {
    setWallpaper(settings, config);
  }).then(function() {
    setRingtone(settings, config);
  }).then(function() {
    setNotification(settings, config);
  }).then(function() {
    overrideSettings(settings, config);
  }).then(function() {
    writeSettings(settings, config);
    return settings;
  });

  // Ensure not quitting xpcshell before all asynchronous code is done
  utils.processEvents(function(){return {wait : false}});

  return result;
}
exports.execute = execute;
exports.setWallpaper = setWallpaper;
exports.setRingtone = setRingtone;
exports.setNotification = setNotification;
exports.overrideSettings = overrideSettings;
exports.writeSettings = writeSettings;
exports.setDefaultKeyboardLayouts = setDefaultKeyboardLayouts;
