
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

if (DEBUG) {
  prefs.push(["marionette.defaultPrefs.enabled", true]);
  prefs.push(["b2g.remote-js.enabled", true]);
  prefs.push(["b2g.remote-js.port", 4242]);
  prefs.push(["javascript.options.showInConsole", true]);
  prefs.push(["nglayout.debug.disable_xul_cache", true]);
  prefs.push(["browser.dom.window.dump.enabled", true]);
  prefs.push(["javascript.options.strict", true]);
  prefs.push(["dom.report_all_js_exceptions", true]);
  prefs.push(["nglayout.debug.disable_xul_fastload", true]);
  prefs.push(["extensions.autoDisableScopes", 0]);
  prefs.push(["browser.startup.homepage", homescreen]);

  prefs.push(["dom.mozBrowserFramesEnabled", true]);
  prefs.push(["b2g.ignoreXFrameOptions", true]);
  prefs.push(["dom.sms.enabled", true]);
  prefs.push(["dom.mozContacts.enabled", true]);
  prefs.push(["dom.mozSettings.enabled", true]);
  prefs.push(["device.storage.enabled", true]);
  prefs.push(["devtools.chrome.enabled", true]);
  prefs.push(["webgl.verbose", true]);

  // Preferences for httpd
  // (Use JSON.stringify in order to avoid taking care of `\` escaping)
  prefs.push(["extensions.gaia.dir", GAIA_DIR]);
  prefs.push(["extensions.gaia.domain", GAIA_DOMAIN]);
  prefs.push(["extensions.gaia.port", parseInt(GAIA_PORT.replace(/:/g, ""))]);
  prefs.push(["extensions.gaia.app_src_dirs", GAIA_APP_SRCDIRS]);
  prefs.push(["extensions.gaia.locales_debug_path", GAIA_LOCALES_PATH]);
  let appPathList = [];
  Gaia.webapps.forEach(function (webapp) {
    appPathList.push(webapp.sourceAppDirectoryName + '/' +
                     webapp.sourceDirectoryName);
  });
  prefs.push(["extensions.gaia.app_relative_path", appPathList.join(' ')]);

  // Identity debug messages
  prefs.push(["toolkit.identity.debug", true]);
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
