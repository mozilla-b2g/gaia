
'use strict';

function debug(msg) {
  //dump('-*- preferences.js ' + msg + '\n');
}

const prefs = [];

let homescreen = HOMESCREEN + (GAIA_PORT ? GAIA_PORT : '');
prefs.push(["browser.manifestURL", homescreen + "/manifest.webapp"]);
if (homescreen.substring(0,6) == "app://") { // B2G bug 773884
    homescreen += "/index.html";
}
prefs.push(["browser.homescreenURL", homescreen]);

let domains = [];
domains.push(GAIA_DOMAIN);

Gaia.webapps.forEach(function (webapp) {
  domains.push(webapp.domain);
});

prefs.push(["network.http.max-connections-per-server", 15]);

// for https://bugzilla.mozilla.org/show_bug.cgi?id=811605 to let user know what prefs is for ril debugging
prefs.push(["ril.debugging.enabled", false]);

if (LOCAL_DOMAINS) {
  prefs.push(["network.dns.localDomains", domains.join(",")]);
}

if (BROWSER) {
  // Set system app as default firefox tab
  prefs.push(["browser.startup.homepage", homescreen]);
  prefs.push(["startup.homepage_welcome_url", ""]);
  // Disable dialog asking to set firefox as default OS browser
  prefs.push(["browser.shell.checkDefaultBrowser", false]);
  // Automatically open devtools on the firefox os panel
  prefs.push(["devtools.toolbox.host", "side"]);
  prefs.push(["devtools.toolbox.sidebar.width", 800]);
  prefs.push(["devtools.toolbox.selectedTool", "firefox-os-controls"]);
  // Disable session store to ensure having only one tab opened
  prefs.push(["browser.sessionstore.max_tabs_undo", 0]);
  prefs.push(["browser.sessionstore.max_windows_undo", 0]);
  prefs.push(["browser.sessionstore.restore_on_demand", false]);
  prefs.push(["browser.sessionstore.resume_from_crash", false]);

  prefs.push(["dom.mozBrowserFramesEnabled", true]);
  prefs.push(["b2g.ignoreXFrameOptions", true]);
  prefs.push(["network.disable.ipc.security", true]);

  prefs.push(["dom.ipc.tabs.disabled", true]);
  prefs.push(["browser.ignoreNativeFrameTextSelection", true]);
  prefs.push(["ui.dragThresholdX", 25]);
  prefs.push(["dom.w3c_touch_events.enabled", 1]);

  // Enable apis use on the device
  prefs.push(["dom.sms.enabled", true]);
  prefs.push(["dom.mozContacts.enabled", true]);
  prefs.push(["dom.mozTCPSocket.enabled", true]);
  prefs.push(["notification.feature.enabled", true]);
  prefs.push(["dom.sysmsg.enabled", true]);
  prefs.push(["dom.mozAlarms.enabled", true]);
  prefs.push(["device.storage.enabled", true]);
  prefs.push(["device.storage.prompt.testing", true]);
  prefs.push(["notification.feature.enabled", true]);

  // WebSettings
  prefs.push(["dom.mozSettings.enabled", true]);
  prefs.push(["dom.navigator-property.disable.mozSettings", false]);
  prefs.push(["dom.mozPermissionSettings.enabled", true]);
}

if (DEBUG) {
  prefs.push(["marionette.defaultPrefs.enabled", true]);

  prefs.push(["nglayout.debug.disable_xul_cache", true]);
  prefs.push(["nglayout.debug.disable_xul_fastload", true]);

  prefs.push(["javascript.options.showInConsole", true]);
  prefs.push(["browser.dom.window.dump.enabled", true]);
  prefs.push(["javascript.options.strict", true]);
  prefs.push(["dom.report_all_js_exceptions", true]);
  prefs.push(["webgl.verbose", true]);

  // Turn off unresponsive script dialogs so test-agent can keep running...
  // https://bugzilla.mozilla.org/show_bug.cgi?id=872141
  prefs.push(["dom.max_script_run_time", 0]);

  // Identity debug messages
  prefs.push(["toolkit.identity.debug", true]);

  // Disable HTTP caching for now
  // This makes working with the system app much easier, due to the iframe
  // caching issue.
  prefs.push(['network.http.use-cache', false]);

  // Preferences for httpd
  // (Use JSON.stringify in order to avoid taking care of `\` escaping)
  prefs.push(["extensions.gaia.dir", GAIA_DIR]);
  prefs.push(["extensions.gaia.domain", GAIA_DOMAIN]);
  prefs.push(["extensions.gaia.port", parseInt(GAIA_PORT.replace(/:/g, ""))]);
  prefs.push(["extensions.gaia.app_src_dirs", GAIA_APP_SRCDIRS]);
  prefs.push(["extensions.gaia.locales_debug_path", GAIA_LOCALES_PATH]);
  prefs.push(["extensions.gaia.official", Boolean(OFFICIAL)]);
  let appPathList = [];
  Gaia.webapps.forEach(function (webapp) {
    appPathList.push(webapp.sourceAppDirectoryName + '/' +
                     webapp.sourceDirectoryName);
  });
  prefs.push(["extensions.gaia.app_relative_path", appPathList.join(' ')]);
}

// We have to allow installing helper addons from profile extension folder
// in both debug and browser compatibility modes
if (DEBUG || BROWSER) {
  prefs.push(["extensions.autoDisableScopes", 0]);
}

function writePrefs() {
  let userJs = getFile(GAIA_DIR, 'profile', 'user.js');
  let content = prefs.map(function (entry) {
    return 'user_pref("' + entry[0] + '", ' + JSON.stringify(entry[1]) + ');';
  }).join('\n');
  writeContent(userJs, content + "\n");
  debug("\n" + content);
}

function setPrefs() {
  prefs.forEach(function(entry) {
    if (typeof entry[1] == "string") {
      Services.prefs.setCharPref(entry[0], entry[1]);
    } else if (typeof entry[1] == "boolean") {
      Services.prefs.setBoolPref(entry[0], entry[1]);
    } else if (typeof entry[1] == "number") {
      Services.prefs.setIntPref(entry[0], entry[1]);
    } else {
      throw new Error("Unsupported pref type: " + typeof entry[1]);
    }
  });
}

if (Gaia.engine === "xpcshell") {
  writePrefs();
} else if (Gaia.engine === "b2g") {
  setPrefs();
}
