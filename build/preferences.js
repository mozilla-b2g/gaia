
'use strict';

var config;
var utils = require('./utils');

function debug(msg) {
  //dump('-*- preferences.js ' + msg + '\n');
}

function execute(options) {
  config = options;
  var gaia = utils.getGaia(config);
  const prefs = [];

  let homescreen = config.HOMESCREEN +
    (config.GAIA_PORT ? config.GAIA_PORT : '');
  prefs.push(['browser.manifestURL', homescreen + '/manifest.webapp']);
  prefs.push(['b2g.neterror.url', homescreen + '/net_error.html']);
  if (homescreen.substring(0, 6) == 'app://') { // B2G bug 773884
      homescreen += '/index.html';
  }
  prefs.push(['browser.homescreenURL', homescreen]);

  let domains = [];
  domains.push(config.GAIA_DOMAIN);

  gaia.webapps.forEach(function(webapp) {
    domains.push(webapp.domain);
  });

  prefs.push(['network.http.max-connections-per-server', 15]);
  prefs.push(['dom.mozInputMethod.enabled', true]);

  // for https://bugzilla.mozilla.org/show_bug.cgi?id=811605 to let user know
  //what prefs is for ril debugging
  prefs.push(['ril.debugging.enabled', false]);
  // Gaia has no vCard/vCalendar for now. Override MMS version to v1.1:
  // TODO: remove this override after having vCard/vCalendar implemented in Gaia.
  // @see bug 885683 - [Messages] MMS doesn't support sending and receiving vCard attachments.
  // @see bug 905548 - [Messages] MMS doesn't support sending and receiving vCalendar attachments.
  prefs.push(['dom.mms.version', 0x11]);
  // TODO: Once platform enabled unsafe WPA-EAP, we have to remove this flag here.
  // @see Bug 790056 - Enable WPA Enterprise
  prefs.push(['b2g.wifi.allow_unsafe_wpa_eap', true]);

  if (config.LOCAL_DOMAINS) {
    prefs.push(['network.dns.localDomains', domains.join(',')]);
  }

  if (config.DESKTOP) {
    // Set system app as default firefox tab
    prefs.push(['browser.startup.homepage', homescreen]);
    prefs.push(['startup.homepage_welcome_url', '']);
    // Disable dialog asking to set firefox as default OS browser
    prefs.push(['browser.shell.checkDefaultBrowser', false]);
    // Automatically open devtools on the firefox os panel
    prefs.push(['devtools.toolbox.host', 'side']);
    prefs.push(['devtools.toolbox.sidebar.width', 800]);
    prefs.push(['devtools.toolbox.selectedTool', 'firefox-os-controls']);
    // Disable session store to ensure having only one tab opened
    prefs.push(['browser.sessionstore.max_tabs_undo', 0]);
    prefs.push(['browser.sessionstore.max_windows_undo', 0]);
    prefs.push(['browser.sessionstore.restore_on_demand', false]);
    prefs.push(['browser.sessionstore.resume_from_crash', false]);

    prefs.push(['dom.mozBrowserFramesEnabled', true]);
    prefs.push(['b2g.ignoreXFrameOptions', true]);
    prefs.push(['network.disable.ipc.security', true]);

    prefs.push(['dom.ipc.tabs.disabled', true]);
    prefs.push(['browser.ignoreNativeFrameTextSelection', true]);
    prefs.push(['ui.dragThresholdX', 25]);
    prefs.push(['dom.w3c_touch_events.enabled', 1]);

    // Enable apis use on the device
    prefs.push(['dom.sms.enabled', true]);
    prefs.push(['dom.mozTCPSocket.enabled', true]);
    prefs.push(['notification.feature.enabled', true]);
    prefs.push(['dom.sysmsg.enabled', true]);
    prefs.push(['dom.mozAlarms.enabled', true]);
    prefs.push(['device.storage.enabled', true]);
    prefs.push(['device.storage.prompt.testing', true]);
    prefs.push(['notification.feature.enabled', true]);
    prefs.push(['dom.datastore.enabled', true]);
    prefs.push(['dom.testing.datastore_enabled_for_hosted_apps', true]);
    prefs.push(['dom.inter-app-communication-api.enabled', true]);

    // WebSettings
    prefs.push(['dom.mozSettings.enabled', true]);
    prefs.push(['dom.navigator-property.disable.mozSettings', false]);
    prefs.push(['dom.mozPermissionSettings.enabled', true]);

    // Contacts
    prefs.push(['dom.mozContacts.enabled', true]);
    prefs.push(['dom.navigator-property.disable.mozContacts', false]);
    prefs.push(['dom.global-constructor.disable.mozContact', false]);

    prefs.push(['dom.experimental_forms', true]);
    prefs.push(['dom.webapps.useCurrentProfile', true]);

    // Settings so desktop shims will work
    prefs.push(['bluetooth.enabled', true]);
    prefs.push(['bluetooth.visible', false]);
    prefs.push(['wifi.enabled', true]);
    prefs.push(['wifi.suspended', false]);

    // Partial implementation of gonk fonts
    // See: http://mxr.mozilla.org/mozilla-central/source/modules/libpref/src/init/all.js#3202
    prefs.push(['font.default.x-western', 'sans-serif']);

    prefs.push(['font.name.serif.x-western', 'Charis SIL Compact']);
    prefs.push(['font.name.sans-serif.x-western', 'Feura Sans']);
    prefs.push(['font.name.monospace.x-western', 'Source Code Pro']);
    prefs.push(['font.name-list.sans-serif.x-western', 'Feura Sans, Roboto']);
  }

  if (config.DEBUG) {
    prefs.push(['docshell.device_size_is_page_size', true]);
    prefs.push(['marionette.defaultPrefs.enabled', true]);

    prefs.push(['nglayout.debug.disable_xul_cache', true]);
    prefs.push(['nglayout.debug.disable_xul_fastload', true]);

    prefs.push(['javascript.options.showInConsole', true]);
    prefs.push(['browser.dom.window.dump.enabled', true]);
    prefs.push(['dom.report_all_js_exceptions', true]);
    prefs.push(['dom.w3c_touch_events.enabled', 1]);
    prefs.push(['dom.promise.enabled', true]);
    prefs.push(['webgl.verbose', true]);

    // Turn off unresponsive script dialogs so test-agent can keep running...
    // https://bugzilla.mozilla.org/show_bug.cgi?id=872141
    prefs.push(['dom.max_script_run_time', 0]);

    // Identity debug messages
    prefs.push(['toolkit.identity.debug', true]);

    // Disable HTTP caching for now
    // This makes working with the system app much easier, due to the iframe
    // caching issue.
    prefs.push(['network.http.use-cache', false]);

    // Preferences for httpd
    // (Use JSON.stringify in order to avoid taking care of `\` escaping)
    prefs.push(['extensions.gaia.dir', config.GAIA_DIR]);
    prefs.push(['extensions.gaia.domain', config.GAIA_DOMAIN]);
    prefs.push(['extensions.gaia.port',
      parseInt(config.GAIA_PORT.replace(/:/g, ''))]);
    prefs.push(['extensions.gaia.appdirs', config.GAIA_APPDIRS]);
    prefs.push(['extensions.gaia.locales_debug_path',
      config.GAIA_LOCALES_PATH]);
    prefs.push(['extensions.gaia.official', Boolean(config.OFFICIAL)]);
    prefs.push(['extensions.gaia.locales_file', config.LOCALES_FILE]);
    // Bug 952901: remove getLocaleBasedir() if bug 952900 fixed.
    prefs.push(['extensions.gaia.locale_basedir',
      utils.getLocaleBasedir(config.LOCALE_BASEDIR)]);

    let suffix = config.GAIA_DEV_PIXELS_PER_PX === '1' ?
                 '' : '@' + config.GAIA_DEV_PIXELS_PER_PX + 'x';
    prefs.push(['extensions.gaia.device_pixel_suffix', suffix]);

    let appPathList = [];
    gaia.webapps.forEach(function(webapp) {
      appPathList.push(webapp.sourceAppDirectoryName + '/' +
                       webapp.sourceDirectoryName);
    });
    prefs.push(['extensions.gaia.app_relative_path', appPathList.join(' ')]);
  }

  // We have to allow installing helper addons from profile extension folder
  // in both debug and browser compatibility modes
  if (config.DEBUG || config.DESKTOP) {
    prefs.push(['extensions.autoDisableScopes', 0]);
  }

  if (config.DEVICE_DEBUG) {
    // Bug 832000: Until unix domain socket are implemented,
    // force enable content actor
    prefs.push(['devtools.debugger.enable-content-actors', true]);
    prefs.push(['devtools.debugger.prompt-connection', false]);
    prefs.push(['devtools.debugger.forbid-certified-apps', false]);
    prefs.push(['b2g.adb.timeout', 0]);
  }

  function writePrefs() {
    let userJs = utils.getFile(config.PROFILE_DIR, 'user.js');
    let content = prefs.map(function(entry) {
      return 'user_pref(\'' + entry[0] + '\', ' +
        JSON.stringify(entry[1]) + ');';
    }).join('\n');
    utils.writeContent(userJs, content + '\n');
    debug('\n' + content);
  }

  function setPrefs() {
    prefs.forEach(function(entry) {
      if (typeof entry[1] == 'string') {
        Services.prefs.setCharPref(entry[0], entry[1]);
      } else if (typeof entry[1] == 'boolean') {
        Services.prefs.setBoolPref(entry[0], entry[1]);
      } else if (typeof entry[1] == 'number') {
        Services.prefs.setIntPref(entry[0], entry[1]);
      } else {
        throw new Error('Unsupported pref type: ' + typeof entry[1]);
      }
    });
  }

  if (gaia.engine === 'xpcshell') {
    writePrefs();
  } else if (gaia.engine === 'b2g') {
    setPrefs();
  }
}

exports.execute = execute;
