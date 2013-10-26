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

  let wallpaper = utils.getAbsoluteOrRelativePath(
    config.GAIA_DISTRIBUTION_DIR + '/wallpapers/default' +
    devpixels + '.jpg', config.GAIA_DIR);

  if (!wallpaper.exists()) {
    wallpaper = utils.getAbsoluteOrRelativePath(
      config.GAIA_DISTRIBUTION_DIR + '/wallpapers/default.jpg',
      config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.getAbsoluteOrRelativePath(
      'build/wallpaper' + devpixels + '.jpg', config.GAIA_DIR);
  }

  if (!wallpaper.exists()) {
    wallpaper = utils.getAbsoluteOrRelativePath('build/wallpaper.jpg',
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
  let ringtone = utils.getAbsoluteOrRelativePath(ringtone_name,
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
  let notification = utils.getAbsoluteOrRelativePath(notification_name,
    config.GAIA_DIR);
  readFileAsDataURL(notification, 'audio/ogg', function(dataURL) {
    settings['notification.ringtone'] = dataURL;
    callback();
  });
}

function overrideSettings() {
  // See if any override file exists and eventually override settings
  let override = utils.getAbsoluteOrRelativePath(config.SETTINGS_PATH,
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
  settings = {
   'accessibility.invert': false,
   'accessibility.screenreader': false,
   'alarm.enabled': false,
   'app.launch_path.blacklist': [],
   'app.reportCrashes': 'ask',
   'app.update.interval': 86400,
   'apz.force-enable': false,
   'audio.volume.alarm': 15,
   'audio.volume.bt_sco': 15,
   'audio.volume.dtmf': 15,
   'audio.volume.content': 15,
   'audio.volume.master': 5,
   'audio.volume.notification': 15,
   'audio.volume.tts': 15,
   'audio.volume.telephony': 5,
   'audio.volume.cemaxvol': 11,
   'bluetooth.enabled': false,
   'bluetooth.debugging.enabled': false,
   'bluetooth.suspended': false,
   'camera.shutter.enabled': true,
   'camera.recordingsound.enabled': false,
   'camera.recording.preferredSizes': [],
   'clear.remote-windows.data': false,
   'debug.console.enabled': false,
   'debug.grid.enabled': false,
   'debug.oop.disabled': false,
   'debug.keyboard-oop.enabled': false,
   'debug.fps.enabled': false,
   'debug.ttl.enabled': false,
   'debug.log-animations.enabled': false,
   'debug.paint-flashing.enabled': false,
   'debug.peformancedata.shared': false,
   'debug.gaia.enabled': false,
   'deviceinfo.firmware_revision': '',
   'deviceinfo.hardware': '',
   'deviceinfo.mac': '',
   'deviceinfo.os': '',
   'deviceinfo.platform_build_id': '',
   'deviceinfo.platform_version': '',
   'deviceinfo.product_model': '',
   'deviceinfo.software': '',
   'deviceinfo.update_channel': '',
   'device.storage.writable.name': 'sdcard',
   'dom.mozContacts.debugging.enabled': false,
   'feedback.url': 'https://input.allizom.org/api/v1/feedback/',
   'gaia.system.checkForUpdates': false,
   'geolocation.enabled': true,
   'geolocation.suspended': false,
   'icc.applications': null,
   'icc.data': null,
   'icc.displayTextTimeout': 40000,
   'icc.inputTextTimeout': 40000,
   'icc.goBackTimeout': 1000,
   'icc.selectTimeout': 150000,
   'keyboard.layouts.english': true,
   'keyboard.layouts.dvorak': false,
   'keyboard.layouts.czech': false,
   'keyboard.layouts.french': false,
   'keyboard.layouts.german': false,
   'keyboard.layouts.hungarian': false,
   'keyboard.layouts.norwegian': false,
   'keyboard.layouts.slovak': false,
   'keyboard.layouts.turkish': false,
   'keyboard.layouts.romanian': false,
   'keyboard.layouts.russian': false,
   'keyboard.layouts.arabic': false,
   'keyboard.layouts.hebrew': false,
   'keyboard.layouts.zhuyin': false,
   'keyboard.layouts.pinyin': false,
   'keyboard.layouts.greek': false,
   'keyboard.layouts.japanese': false,
   'keyboard.layouts.polish': false,
   'keyboard.layouts.portuguese': false,
   'keyboard.layouts.serbian': false,
   'keyboard.layouts.spanish': false,
   'keyboard.layouts.catalan': false,
   'keyboard.vibration': false,
   'keyboard.clicksound': false,
   'keyboard.autocorrect': true,
   'keyboard.wordsuggestion': true,
   'keyboard.current': 'en',
   'keyboard.ftu.enabled': true,
   'language.current': 'en-US',
   'layers.draw-borders': false,
   'lockscreen.passcode-lock.code': '0000',
   'lockscreen.passcode-lock.timeout': 0,
   'lockscreen.passcode-lock.enabled': false,
   'lockscreen.notifications-preview.enabled': true,
   'lockscreen.enabled': true,
   'lockscreen.locked': true,
   'lockscreen.unlock-sound.enabled': false,
   'mail.sent-sound.enabled': true,
   'message.sent-sound.enabled': true,
   'operatorvariant.mcc': '000',
   'operatorvariant.mnc': '00',
   'phone.ring.keypad': true,
   'phone.dtmf.type': 'long',
   'powersave.enabled': false,
   'powersave.threshold': -1,
   'privacy.donottrackheader.value': '-1',
   'privacy.donottrackheader.enabled': false,
   'ril.data.suspended': false,
   'ril.iccInfo.mbdn': '',
   'ril.sms.requestStatusReport.enabled': false,
   'ril.cellbroadcast.searchlist': '',
   'ril.callwaiting.enabled': null,
   'ril.cf.enabled': false,
   'ril.data.enabled': false,
   'ril.data.apn': '',
   'ril.data.carrier': '',
   'ril.data.passwd': '',
   'ril.data.httpProxyHost': '',
   'ril.data.httpProxyPort': 0,
   'ril.data.mmsc': '',
   'ril.data.mmsproxy': '',
   'ril.data.mmsport': 0,
   'ril.data.roaming_enabled': false,
   'ril.data.user': '',
   'ril.data.authtype': 'notDefined',
   'ril.mms.apn': '',
   'ril.mms.carrier': '',
   'ril.mms.httpProxyHost': '',
   'ril.mms.httpProxyPort': '',
   'ril.mms.mmsc': '',
   'ril.mms.mmsport': '',
   'ril.mms.mmsproxy': '',
   'ril.mms.passwd': '',
   'ril.mms.user': '',
   'ril.mms.retrieval_mode': 'automatic-home',
   'ril.mms.authtype': 'notDefined',
   'dom.mms.operatorSizeLimitation': 307200,
   'ril.radio.preferredNetworkType': '',
   'ril.radio.disabled': false,
   'ril.supl.apn': '',
   'ril.supl.carrier': '',
   'ril.supl.httpProxyHost': '',
   'ril.supl.httpProxyPort': '',
   'ril.supl.passwd': '',
   'ril.supl.user': '',
   'ril.supl.authtype': 'notDefined',
   'ril.sms.strict7BitEncoding.enabled': false,
   'ril.cellbroadcast.disabled': false,
   'ril.data.apnSettings': '',
   'ril.callerId': 'CLIR_DEFAULT',
   'screen.automatic-brightness': true,
   'screen.brightness': 1,
   'screen.timeout': 60,
   'software-button.enabled': false,
   'homegesture.enabled': false,
   'support.onlinesupport.title': '',
   'support.onlinesupport.href': '',
   'support.callsupport1.title': '',
   'support.callsupport1.href': '',
   'support.callsupport2.title': '',
   'support.callsupport2.href': '',
   'telephony.speaker.enabled': false,
   'tethering.usb.enabled': false,
   'tethering.usb.ip': '192.168.0.1',
   'tethering.usb.prefix': '24',
   'tethering.usb.dhcpserver.startip': '192.168.0.10',
   'tethering.usb.dhcpserver.endip': '192.168.0.30',
   'tethering.wifi.enabled': false,
   'tethering.wifi.ip': '192.168.1.1',
   'tethering.wifi.prefix': '24',
   'tethering.wifi.dhcpserver.startip': '192.168.1.10',
   'tethering.wifi.dhcpserver.endip': '192.168.1.30',
   'tethering.wifi.ssid': 'FirefoxHotspot',
   'tethering.wifi.security.type': 'open',
   'tethering.wifi.security.password': '1234567890',
   'tethering.wifi.connectedClients': 0,
   'tethering.usb.connectedClients': 0,
   'time.clock.automatic-update.enabled': true,
   'time.timezone.automatic-update.enabled': true, 
   'time.timezone': null,
   'ums.enabled': false,
   'ums.mode': 0,
   'ums.status': 0,
   'ums.volume.sdcard.enabled': true,
   'ums.volume.extsdcard.enabled': false,
   'vibration.enabled': true,
   'wifi.enabled': true,
   'wifi.screen_off_timeout': 600000,
   'wifi.suspended': false,
   'wifi.disabled_by_wakelock': false,
   'wifi.notification': false,
   'wifi.connect_via_settings': false,
   'wap.push.enabled': true
  };

  // We want the console to be disabled for device builds using the user variant.
  if (config.TARGET_BUILD_VARIANT != 'user')
    settings['debug.console.enabled'] = true;

  // Set the homescreen URL
  settings['homescreen.manifestURL'] = utils.gaiaManifestURL('homescreen',
    config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT);

  // Set the ftu manifest URL
  if (config.NOFTU === '0') {
    settings['ftu.manifestURL'] = utils.gaiaManifestURL('communications',
      config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT);
  }

  if (config.PRODUCTION === '1') {
    settings['feedback.url'] = 'https://input.mozilla.org/api/v1/feedback/';
  }

  settings['language.current'] = config.GAIA_DEFAULT_LOCALE;
  let file = utils.getGaia(config).sharedFolder.clone();
  file.append('resources');
  file.append('keyboard_layouts.json');
  let keyboard_layouts_res = utils.getJSON(file);
  let keyboard_layouts = keyboard_layouts_res['layout'];
  let keyboard_nonLatins = keyboard_layouts_res['nonLatin'];
  let default_layout;
  if (config.GAIA_DEFAULT_LOCALE in keyboard_layouts) {
    default_layout = keyboard_layouts[config.GAIA_DEFAULT_LOCALE];
    if (!(config.GAIA_DEFAULT_LOCALE in keyboard_nonLatins)) {
      settings['keyboard.layouts.english'] = false;
    }
    settings['keyboard.layouts.' + default_layout] = true;
  }

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
