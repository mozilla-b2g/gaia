/*global exports, Services, require*/
'use strict';

var utils = require('./utils');

var PreferencesBuilder = function() {
};

PreferencesBuilder.prototype.setConfig = function(config) {
  this.config = config;
  this.prefs = {};
  this.gaia = utils.gaia.getInstance(this.config);
};

PreferencesBuilder.prototype.execute = function(config) {
  this.setConfig(config);
  this.preparePref();
  if (this.gaia.engine === 'xpcshell') {
    this.writePref();
  } else if (this.gaia.engine === 'b2g') {
    this.setPrefs();
  }
};

PreferencesBuilder.prototype.preparePref = function() {
  this.homescreen = this.config.HOMESCREEN +
    (this.config.GAIA_PORT ? this.config.GAIA_PORT : '');

  this.prefs['browser.manifestURL'] =
                   this.homescreen + '/manifest.webapp';
  this.prefs['b2g.neterror.url'] = this.homescreen + '/net_error.html';
  if (this.homescreen.substring(0, 6) == 'app://') { // B2G bug 773884
      this.homescreen += '/index.html';
  }
  this.prefs['browser.homescreenURL'] = this.homescreen;

  this.domains = [];
  this.domains.push(this.config.GAIA_DOMAIN);

  this.gaia.webapps.forEach(function(webapp) {
    this.domains.push(webapp.domain);
  }.bind(this));

  this.prefs['network.http.max-connections-per-server'] = 15;
  this.prefs['dom.mozInputMethod.enabled'] = true;
  this.prefs['layout.css.sticky.enabled'] = true;

  // for https://bugzilla.mozilla.org/show_bug.cgi?id=811605 to let user know
  //what prefs is for ril debugging
  this.prefs['ril.debugging.enabled'] = false;
  // Gaia has no vCard/vCalendar for now. Override MMS version to v1.1:
  // TODO: remove this override after having vCard/vCalendar implemented in
  //       Gaia.
  // @see bug 885683 - [Messages] MMS doesn't support sending and receiving
  //                    vCard attachments.
  // @see bug 905548 - [Messages] MMS doesn't support sending and receiving
  //                    vCalendar attachments.
  this.prefs['dom.mms.version'] = 0x11;
  // TODO: Once platform enabled unsafe WPA-EAP, we have to remove this flag
  //       here.
  // @see Bug 790056 - Enable WPA Enterprise
  this.prefs['b2g.wifi.allow_unsafe_wpa_eap'] = true;
  if (this.config.LOCAL_DOMAINS) {
    this.setLocalDomainPref();
  }
  if (this.config.DESKTOP) {
    this.setDesktopPref();
  }
  if (this.config.DEBUG) {
    this.setDebugPref();
  }
  if (this.config.DEVICE_DEBUG) {
    this.setDeviceDebugPref();
  }
};

PreferencesBuilder.prototype.setLocalDomainPref = function() {
  this.prefs['network.dns.localDomains'] = this.domains.join(',');
};

PreferencesBuilder.prototype.setDesktopPref = function() {
  // Set system app as default firefox tab
  this.prefs['browser.startup.homepage'] = this.homescreen;
  this.prefs['startup.homepage_welcome_url'] = '';
  // Disable dialog asking to set firefox as default OS browser
  this.prefs['browser.shell.checkDefaultBrowser'] = false;
  // Automatically open devtools on the firefox os panel
  this.prefs['devtools.toolbox.host'] = 'side';
  this.prefs['devtools.toolbox.sidebar.width'] = 800;
  this.prefs['devtools.toolbox.selectedTool'] = 'firefox-os-controls';
  // Disable session store to ensure having only one tab opened
  this.prefs['browser.sessionstore.max_tabs_undo'] = 0;
  this.prefs['browser.sessionstore.max_windows_undo'] = 0;
  this.prefs['browser.sessionstore.restore_on_demand'] = false;
  this.prefs['browser.sessionstore.resume_from_crash'] = false;

  this.prefs['dom.mozBrowserFramesEnabled'] = true;
  this.prefs['b2g.ignoreXFrameOptions'] = true;
  this.prefs['network.disable.ipc.security'] = true;

  this.prefs['dom.ipc.tabs.disabled'] = true;
  this.prefs['browser.ignoreNativeFrameTextSelection'] = true;
  this.prefs['ui.dragThresholdX'] = 25;
  this.prefs['dom.w3c_touch_events.enabled'] = 1;

  // Enable apis use on the device
  this.prefs['dom.sms.enabled'] = true;
  this.prefs['dom.mozTCPSocket.enabled'] = true;
  this.prefs['notification.feature.enabled'] = true;
  this.prefs['dom.sysmsg.enabled'] = true;
  this.prefs['dom.mozAlarms.enabled'] = true;
  this.prefs['device.storage.enabled'] = true;
  this.prefs['device.storage.prompt.testing'] = true;
  this.prefs['dom.datastore.enabled'] = true;
  this.prefs['dom.testing.datastore_enabled_for_hosted_apps'] = true;
  this.prefs['dom.inter-app-communication-api.enabled'] = true;

  // WebSettings
  this.prefs['dom.mozSettings.enabled'] = true;
  this.prefs['dom.navigator-property.disable.mozSettings'] = false;
  this.prefs['dom.mozPermissionSettings.enabled'] = true;

  // Contacts
  this.prefs['dom.mozContacts.enabled'] = true;
  this.prefs['dom.navigator-property.disable.mozContacts'] = false;
  this.prefs['dom.global-constructor.disable.mozContact'] = false;

  this.prefs['dom.experimental_forms'] = true;
  this.prefs['dom.webapps.useCurrentProfile'] = true;

  // Settings so desktop shims will work
  this.prefs['bluetooth.enabled'] = true;
  this.prefs['bluetooth.visible'] = false;
  this.prefs['wifi.enabled'] = true;
  this.prefs['wifi.suspended'] = false;

  // Partial implementation of gonk fonts
  // See: http://mxr.mozilla.org/mozilla-central/source/modules/libpref/src/
  //      init/all.js#3202
  this.prefs['font.default.x-western'] = 'sans-serif';

  this.prefs['font.name.serif.x-western'] = 'Charis SIL Compact';
  this.prefs['font.name.sans-serif.x-western'] = 'Feura Sans';
  this.prefs['font.name.monospace.x-western'] = 'Source Code Pro';
  this.prefs['font.name-list.sans-serif.x-western'] = 'Feura Sans, Roboto';
  this.prefs['extensions.autoDisableScopes'] = 0;
};

PreferencesBuilder.prototype.setDebugPref = function() {
  this.prefs['docshell.device_size_is_page_size'] = true;
  this.prefs['marionette.defaultPrefs.enabled'] = true;

  this.prefs['nglayout.debug.disable_xul_cache'] = true;
  this.prefs['nglayout.debug.disable_xul_fastload'] = true;

  this.prefs['javascript.options.showInConsole'] = true;
  this.prefs['browser.dom.window.dump.enabled'] = true;
  this.prefs['dom.report_all_js_exceptions'] = true;
  this.prefs['dom.w3c_touch_events.enabled'] = 1;
  this.prefs['dom.promise.enabled'] = true;
  this.prefs['dom.wakelock.enabled'] = true;
  this.prefs['webgl.verbose'] = true;

  // Turn off unresponsive script dialogs so test-agent can keep running...
  // https://bugzilla.mozilla.org/show_bug.cgi?id=872141
  this.prefs['dom.max_script_run_time'] = 0;

  // Identity debug messages
  this.prefs['toolkit.identity.debug'] = true;

  // Disable HTTP caching for now
  // This makes working with the system app much easier, due to the iframe
  // caching issue.
  this.prefs['network.http.use-cache'] = false;

  // Preferences for httpd
  // (Use JSON.stringify in order to avoid taking care of `\` escaping)
  this.prefs['extensions.gaia.dir'] = this.config.GAIA_DIR;
  this.prefs['extensions.gaia.domain'] = this.config.GAIA_DOMAIN;
  this.prefs['extensions.gaia.port'] =
    parseInt(this.config.GAIA_PORT.replace(/:/g, ''), 10);
  this.prefs['extensions.gaia.appdirs'] = this.config.GAIA_APPDIRS;
  this.prefs['extensions.gaia.locales_debug_path'] =
    this.config.GAIA_LOCALES_PATH;
  this.prefs['extensions.gaia.official'] = Boolean(this.config.OFFICIAL);
  this.prefs['extensions.gaia.locales_file'] = this.config.LOCALES_FILE;
  // Bug 952901: remove getLocaleBasedir() if bug 952900 fixed.
  this.prefs['extensions.gaia.locale_basedir'] =
    utils.getLocaleBasedir(this.config.LOCALE_BASEDIR);

  var suffix = this.config.GAIA_DEV_PIXELS_PER_PX === '1' ?
               '' : '@' + this.config.GAIA_DEV_PIXELS_PER_PX + 'x';
  this.prefs['extensions.gaia.device_pixel_suffix'] = suffix;

  var appPathList = [];
  this.gaia.webapps.forEach(function(webapp) {
    appPathList.push(webapp.sourceAppDirectoryName + '/' +
                     webapp.sourceDirectoryName);
  });
  this.prefs['extensions.gaia.app_relative_path'] = appPathList.join(' ');
  this.prefs['extensions.autoDisableScopes'] = 0;
};

PreferencesBuilder.prototype.setDeviceDebugPref = function() {
  // Bug 832000: Until unix domain socket are implemented,
  // force enable content actor
  this.prefs['devtools.debugger.enable-content-actors'] = true;
  this.prefs['devtools.debugger.prompt-connection'] = false;
  this.prefs['devtools.debugger.forbid-certified-apps'] = false;
  this.prefs['b2g.adb.timeout'] = 0;
};

PreferencesBuilder.prototype.writePref = function() {
  var userJs = utils.getFile(this.config.PROFILE_DIR, 'user.js');
  var content = '';
  for (var pref in this.prefs) {
    content += 'user_pref(\'' + pref + '\', ' +
                JSON.stringify(this.prefs[pref]) + ');\n';
  }
  utils.writeContent(userJs, content + '\n');
};

PreferencesBuilder.prototype.setPrefs = function() {
  for (var pref in this.prefs) {
    switch(typeof this.prefs[pref]) {
      case 'string':
        utils.Services.prefs.setCharPref(pref, this.prefs[pref]);
        break;
      case 'boolean':
        utils.Services.prefs.setBoolPref(pref, this.prefs[pref]);
        break;
      case 'number':
        utils.Services.prefs.setIntPref(pref, this.prefs[pref]);
        break;
      default:
        throw new Error('Unsupported pref type: ' + typeof this.prefs[pref]);
    }
  }
};


exports.execute = function(config) {
  (new PreferencesBuilder()).execute(config);
};

exports.PreferencesBuilder = PreferencesBuilder;
