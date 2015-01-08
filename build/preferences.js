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

  if (config.DEBUG === '1') {
    this.extenedPrefFiles.push('debug-prefs.js');
  }
};

PreferencesBuilder.prototype.execute = function(config) {
  this.setConfig(config);
  this.preparePref();
  this.loadBuildPrefs();
  if (this.gaia.engine === 'xpcshell') {
    let jsPath = utils.getFile(this.config.PROFILE_DIR, 'user.js').path;
    this.writePrefs(jsPath, this.prefs, this.userPrefs);
  } else if (this.gaia.engine === 'b2g') {
    this.setPrefs();
  }
  this.writeDefaultUserJs();
};

PreferencesBuilder.prototype.writeDefaultUserJs = function() {
  if (this.config.BUILD_APP_NAME !== '*') {
    return;
  }

  // create a folder to store data for B2G, this folder will copy to
  // b2g output folder.
  let defaultsDir = utils.getFile(this.config.PROFILE_DIR, 'defaults');

  defaultsDir.append('pref');
  utils.ensureFolderExists(defaultsDir);
  let userJs = defaultsDir.clone();
  userJs.append('user.js');
  let allPrefs = utils.cloneJSON(this.prefs);
  for (let pref in this.userPrefs) {
    allPrefs[pref] = this.userPrefs[pref];
  }

  this.writePrefs(userJs.path, allPrefs, {});
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

  this.domains = [this.config.GAIA_DOMAIN, 'theme.' + this.config.GAIA_DOMAIN];
  this.config.GAIA_ALLAPPDIRS.split(' ').forEach(function(appdir) {
    this.domains.push(utils.getFile(appdir).leafName + '.' +
      this.config.GAIA_DOMAIN);
  }, this);

  this.userPrefs['network.http.max-connections-per-server'] = 15;
  this.userPrefs['dom.mozInputMethod.enabled'] = true;
  this.userPrefs['layout.css.scroll-behavior.enabled'] = true;
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
  if (this.config.LOCAL_DOMAINS === '1') {
    this.setLocalDomainPref();
  }
  if (this.config.DESKTOP === '1') {
    this.setDesktopPref();
  }
  if (this.config.DEBUG === '1') {
    this.setDebugPref();
  }
  if (this.config.DEVICE_DEBUG === '1') {
    this.setDeviceDebugPref();
  }
};

PreferencesBuilder.prototype.setLocalDomainPref = function() {
  this.userPrefs['network.dns.localDomains'] = this.domains.join(',');
};

PreferencesBuilder.prototype.setDesktopPref = function() {
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

  // electrolysis breaks the app:// protocol as registered by httpd.js
  // see Bug 1097912
  this.userPrefs['browser.tabs.remote.autostart'] = false;
  this.userPrefs['browser.tabs.remote.autostart.1'] = false;
};

PreferencesBuilder.prototype.setDeviceDebugPref = function() {
  this.userPrefs['devtools.debugger.prompt-connection'] = false;
  this.userPrefs['devtools.debugger.forbid-certified-apps'] = false;
  // Bug 1001348: This optimization prevents debugger to fetch script sources
  // of certified apps as well as chrome code:
  this.userPrefs['javascript.options.discardSystemSource'] = false;
  this.userPrefs['b2g.adb.timeout'] = 0;
};

PreferencesBuilder.prototype.writePrefs = function(jsPath, prefs, userPrefs) {
  var userJs = utils.getFile(jsPath);
  var content = '';
  var pref;
  // output pref
  for (pref in prefs) {
    content += 'pref(\'' + pref + '\', ' +
                JSON.stringify(prefs[pref]) + ');\n';
  }
  // output user_pref
  for (pref in userPrefs) {
    content += 'user_pref(\'' + pref + '\', ' +
                JSON.stringify(userPrefs[pref]) + ');\n';
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
