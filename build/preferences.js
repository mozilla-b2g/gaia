/* global exports, require */
'use strict';

var utils = require('./utils');

// Optional partner provided preference files. They will be added
// after the ones on the extenedPrefFiles and they will be read
// from the GAIA_DISTRIBUTION_DIR directory
var PARTNER_PREF_FILES = ['partner-prefs.js'];

var PreferencesBuilder = function() {
};

PreferencesBuilder.prototype.setConfig = function(config) {
  this.config = config;
  this.prefs = {};
  this.userPrefs = {};
  this.gaia = utils.gaia.getInstance(this.config);

  // Optional files that may be provided to extend the set of default
  // preferences installed for gaia.  If the preferences in these files
  // conflict, the result is undefined.
  this.extenedPrefFiles = ['custom-prefs.js', 'gps-prefs.js',
    'payment-prefs.js'];

  if (config.GAIA_APP_TARGET === 'engineering') {
    this.extenedPrefFiles.push('payment-dev-prefs.js');
  } else if (config.GAIA_APP_TARGET === 'dogfood') {
    this.extenedPrefFiles.push('dogfood-prefs.js');
  }

  if (config.DEBUG === 1) {
    this.extenedPrefFiles.push('debug-prefs.js');
  }
};

PreferencesBuilder.prototype.execute = function(config) {
  this.setConfig(config);
  this.preparePref();
  this.loadBuildPrefs();
  if (this.gaia.engine === 'xpcshell') {
    this.writePrefs();
  } else if (this.gaia.engine === 'b2g') {
    this.setPrefs();
  }
};

PreferencesBuilder.prototype.loadBuildPrefs = function() {
  var buildConfigDir = utils.getFile(this.config.GAIA_DIR, 'build', 'config');
  this.loadPrefFile(buildConfigDir, this.extenedPrefFiles);

  var deviceConfigDir = utils.getFile(this.config.GAIA_DIR, 'build', 'config',
                        this.config.GAIA_DEVICE_TYPE);
  this.loadPrefFile(deviceConfigDir, this.extenedPrefFiles);

  try {
    var distDir = utils.getFile(this.config.GAIA_DISTRIBUTION_DIR);
    this.loadPrefFile(distDir, PARTNER_PREF_FILES);
  } catch (e) {
    // utils.getFile will throw exception if GAIA_DISTRIBUTION_DIR does not
    // exist. In this case we just don't override preferences by
    // PARTNER_PREF_FILES.
  }
};

PreferencesBuilder.prototype.loadPrefFile = function(srcDir, srcPrefFiles) {
  // scope object for hosting functions and variables.
  var self = this;
  var scope = {
    user_pref: function(key, value) {
      self.userPrefs[key] = self.customizePrefValue(key, value);
    },
    pref: function fillPref(key, value) {
      self.prefs[key] = self.customizePrefValue(key, value);
    }
  };

  // read all files
  srcPrefFiles.forEach(function(filename) {
    var srcFile = srcDir.clone();
    srcFile.append(filename);
    if (srcFile.exists()) {
      utils.scriptLoader.load(srcFile.path, scope, true);
    }
  });
};

PreferencesBuilder.prototype.customizePrefValue = function(key, value) {
  switch(key) {
    case 'devtools.responsiveUI.customWidth':
      // The responsive UI has padding and border at width.
      // width = 320 + 15(horizontal padding) * 2 + 1(vertical border) * 2
      return value + 32;
    case 'devtools.responsiveUI.customHeight':
      // The responsive UI has padding and border at width.
      // height = 480 + 60(top padding) + 1(top border)
      return value + 61;
  }
  return value;
};

PreferencesBuilder.prototype.preparePref = function() {
  this.system = this.config.SYSTEM;

  this.userPrefs['b2g.system_manifest_url'] =
                   this.system + '/manifest.webapp';

  this.userPrefs['b2g.neterror.url'] = this.system + '/net_error.html';
  if (this.system.substring(0, 6) == 'app://') { // B2G bug 773884
      this.system += '/index.html';
  }

  this.userPrefs['b2g.system_startup_url'] = this.system;

  this.domains = [this.config.GAIA_DOMAIN];
  this.config.GAIA_ALLAPPDIRS.split(' ').forEach(function(appdir) {
    this.domains.push(utils.getFile(appdir).leafName + '.' +
      this.config.GAIA_DOMAIN);
  }, this);

  this.userPrefs['network.http.max-connections-per-server'] = 15;
  this.userPrefs['dom.mozInputMethod.enabled'] = true;
  this.userPrefs['layout.css.sticky.enabled'] = true;
  this.userPrefs['intl.uidirection.qps-plocm'] = 'rtl';

  // for https://bugzilla.mozilla.org/show_bug.cgi?id=811605 to let user know
  //what prefs is for ril debugging
  this.userPrefs['ril.debugging.enabled'] = false;
  // Gaia has no vCard/vCalendar for now. Override MMS version to v1.1:
  // TODO: remove this override after having vCard/vCalendar implemented in
  //       Gaia.
  // @see bug 885683 - [Messages] MMS doesn't support sending and receiving
  //                    vCard attachments.
  // @see bug 905548 - [Messages] MMS doesn't support sending and receiving
  //                    vCalendar attachments.
  this.userPrefs['dom.mms.version'] = 0x11;
  // TODO: Once platform enabled unsafe WPA-EAP, we have to remove this flag
  //       here.
  // @see Bug 790056 - Enable WPA Enterprise
  this.userPrefs['b2g.wifi.allow_unsafe_wpa_eap'] = true;
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
  this.userPrefs['network.dns.localDomains'] = this.domains.join(',');
};

PreferencesBuilder.prototype.setDesktopPref = function() {
  // Set system app as default firefox tab
  this.userPrefs['browser.startup.homepage'] = this.system;
  this.userPrefs['startup.homepage_welcome_url'] = '';
  // Disable dialog asking to set firefox as default OS browser
  this.userPrefs['browser.shell.checkDefaultBrowser'] = false;
  // Automatically open devtools on the firefox os panel
  this.userPrefs['devtools.toolbox.host'] = 'side';
  this.userPrefs['devtools.toolbox.sidebar.width'] = 800;
  this.userPrefs['devtools.toolbox.selectedTool'] = 'firefox-os-controls';
  // Disable session store to ensure having only one tab opened
  this.userPrefs['browser.sessionstore.max_tabs_undo'] = 0;
  this.userPrefs['browser.sessionstore.max_windows_undo'] = 0;
  this.userPrefs['browser.sessionstore.restore_on_demand'] = false;
  this.userPrefs['browser.sessionstore.resume_from_crash'] = false;

  this.userPrefs['dom.mozBrowserFramesEnabled'] = true;
  this.userPrefs['b2g.ignoreXFrameOptions'] = true;
  this.userPrefs['network.disable.ipc.security'] = true;

  this.userPrefs['dom.ipc.tabs.disabled'] = true;
  this.userPrefs['browser.ignoreNativeFrameTextSelection'] = true;
  this.userPrefs['ui.dragThresholdX'] = 25;
  this.userPrefs['dom.w3c_touch_events.enabled'] = 1;

  // Enable apis use on the device
  this.userPrefs['dom.sms.enabled'] = true;
  this.userPrefs['dom.mozTCPSocket.enabled'] = true;
  this.userPrefs['notification.feature.enabled'] = true;
  this.userPrefs['dom.sysmsg.enabled'] = true;
  this.userPrefs['dom.mozAlarms.enabled'] = true;
  this.userPrefs['device.storage.enabled'] = true;
  this.userPrefs['device.storage.prompt.testing'] = true;
  this.userPrefs['dom.datastore.enabled'] = true;
  this.userPrefs['dom.testing.datastore_enabled_for_hosted_apps'] = true;
  this.userPrefs['dom.inter-app-communication-api.enabled'] = true;

  // WebSettings
  this.userPrefs['dom.mozSettings.enabled'] = true;
  this.userPrefs['dom.navigator-property.disable.mozSettings'] = false;
  this.userPrefs['dom.mozPermissionSettings.enabled'] = true;

  // Contacts
  this.userPrefs['dom.mozContacts.enabled'] = true;
  this.userPrefs['dom.navigator-property.disable.mozContacts'] = false;
  this.userPrefs['dom.global-constructor.disable.mozContact'] = false;

  this.userPrefs['dom.experimental_forms'] = true;
  this.userPrefs['dom.webapps.useCurrentProfile'] = true;

  // Settings so desktop shims will work
  this.userPrefs['bluetooth.enabled'] = true;
  this.userPrefs['bluetooth.visible'] = false;
  this.userPrefs['wifi.enabled'] = true;
  this.userPrefs['wifi.suspended'] = false;

  // Partial implementation of gonk fonts
  // See: http://mxr.mozilla.org/mozilla-central/source/modules/libpref/src/
  //      init/all.js#3202
  this.userPrefs['font.default.x-western'] = 'sans-serif';

  this.userPrefs['font.name.serif.x-western'] = 'Charis SIL Compact';
  this.userPrefs['font.name.sans-serif.x-western'] = 'Fira Sans';
  this.userPrefs['font.name.monospace.x-western'] = 'Source Code Pro';
  this.userPrefs['font.name-list.sans-serif.x-western'] = 'Fira Sans, Roboto';
  this.userPrefs['extensions.autoDisableScopes'] = 0;
};

PreferencesBuilder.prototype.setDebugPref = function() {
  this.userPrefs['docshell.device_size_is_page_size'] = true;
  this.userPrefs['marionette.defaultPrefs.enabled'] = true;

  this.userPrefs['nglayout.debug.disable_xul_cache'] = true;
  this.userPrefs['nglayout.debug.disable_xul_fastload'] = true;

  this.userPrefs['javascript.options.showInConsole'] = true;
  this.userPrefs['browser.dom.window.dump.enabled'] = true;
  this.userPrefs['dom.report_all_js_exceptions'] = true;
  this.userPrefs['dom.w3c_touch_events.enabled'] = 1;
  this.userPrefs['dom.promise.enabled'] = true;
  this.userPrefs['dom.wakelock.enabled'] = true;
  this.userPrefs['image.mozsamplesize.enabled'] = true;
  this.userPrefs['webgl.verbose'] = true;

  // Turn off unresponsive script dialogs so test-agent can keep running...
  // https://bugzilla.mozilla.org/show_bug.cgi?id=872141
  this.userPrefs['dom.max_script_run_time'] = 0;

  // Identity debug messages
  this.userPrefs['toolkit.identity.debug'] = true;

  // Disable HTTP caching for now
  // This makes working with the system app much easier, due to the iframe
  // caching issue.
  this.userPrefs['network.http.use-cache'] = false;

  // Preferences for httpd
  // (Use JSON.stringify in order to avoid taking care of `\` escaping)
  this.userPrefs['extensions.gaia.dir'] = this.config.GAIA_DIR;
  this.userPrefs['extensions.gaia.domain'] = this.config.GAIA_DOMAIN;
  this.userPrefs['extensions.gaia.port'] =
    parseInt(this.config.GAIA_PORT.replace(/:/g, ''), 10);
  this.userPrefs['extensions.gaia.appdirs'] = this.config.GAIA_APPDIRS;
  this.userPrefs['extensions.gaia.allappdirs'] = this.config.GAIA_ALLAPPDIRS;
  this.userPrefs['extensions.gaia.locales_debug_path'] =
    this.config.GAIA_LOCALES_PATH;
  this.userPrefs['extensions.gaia.official'] = Boolean(this.config.OFFICIAL);
  this.userPrefs['extensions.gaia.locales_file'] = this.config.LOCALES_FILE;
  // Bug 952901: remove getLocaleBasedir() if bug 952900 fixed.
  this.userPrefs['extensions.gaia.locale_basedir'] =
    utils.getLocaleBasedir(this.config.LOCALE_BASEDIR);

  var suffix = this.config.GAIA_DEV_PIXELS_PER_PX === '1' ?
               '' : '@' + this.config.GAIA_DEV_PIXELS_PER_PX + 'x';
  this.userPrefs['extensions.gaia.device_pixel_suffix'] = suffix;
  this.userPrefs['extensions.autoDisableScopes'] = 0;
};

PreferencesBuilder.prototype.setDeviceDebugPref = function() {
  this.userPrefs['devtools.debugger.prompt-connection'] = false;
  this.userPrefs['devtools.debugger.forbid-certified-apps'] = false;
  // Bug 1001348: This optimization prevents debugger to fetch script sources
  // of certified apps as well as chrome code:
  this.userPrefs['javascript.options.discardSystemSource'] = false;
  this.userPrefs['b2g.adb.timeout'] = 0;
};

PreferencesBuilder.prototype.writePrefs = function() {
  var userJs = utils.getFile(this.config.PROFILE_DIR, 'user.js');
  var content = '';
  var pref;
  // output pref
  for (pref in this.prefs) {
    content += 'pref(\'' + pref + '\', ' +
                JSON.stringify(this.prefs[pref]) + ');\n';
  }
  // output user_pref
  for (pref in this.userPrefs) {
    content += 'user_pref(\'' + pref + '\', ' +
                JSON.stringify(this.userPrefs[pref]) + ');\n';
  }
  utils.writeContent(userJs, content + '\n');
};

PreferencesBuilder.prototype.setPrefs = function() {
  [this.prefs, this.userPrefs].forEach(function(prefs) {
    for (var pref in prefs) {
      switch(typeof prefs[pref]) {
        case 'string':
          utils.Services.prefs.setCharPref(pref, prefs[pref]);
          break;
        case 'boolean':
          utils.Services.prefs.setBoolPref(pref, prefs[pref]);
          break;
        case 'number':
          utils.Services.prefs.setIntPref(pref, prefs[pref]);
          break;
        default:
          throw new Error('Unsupported pref type: ' + typeof prefs[pref]);
      }
    }
  });
};


exports.execute = function(config) {
  if (config.BUILD_APP_NAME !== '*') {
    return;
  }
  (new PreferencesBuilder()).execute(config);
};

exports.PreferencesBuilder = PreferencesBuilder;
