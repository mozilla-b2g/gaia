
// XXX Remove all the permission parts here once bug 774716 is resolved

let permissions = {
  "power": {
    "urls": [],
    "pref": "dom.power.whitelist"
  },
  "sms": {
    "urls": [],
    "pref": "dom.sms.whitelist"
  },
  "mozBluetooth": {
    "urls": [],
    "pref": "dom.mozBluetooth.whitelist"
  },
  "voicemail": {
    "urls": [],
    "pref": "dom.voicemail.whitelist"
  },
  "mozbrowser": {
    "urls": [],
    "pref": "dom.mozBrowserFramesWhitelist"
  },
  "mozApps": {
    "urls": [],
    "pref": "dom.mozApps.whitelist"
  },
  "mobileconnection": {
    "urls": [],
    "pref": "dom.mobileconnection.whitelist"
  },
  "mozFM": {
    "urls": [],
    "pref": "dom.mozFMRadio.whitelist"
  },
  "systemXHR": {
    "urls": [],
    "pref": "dom.systemXHR.whitelist"
  },
};

let content = "";

let homescreen = HOMESCREEN + (GAIA_PORT ? GAIA_PORT : '');
content += "user_pref(\"browser.manifestURL\",\"" + homescreen + "/manifest.webapp\");\n\n";
if (homescreen.substring(0,6) == "app://") { // B2G bug 773884
    homescreen += "/index.html";
}
content += "user_pref(\"browser.homescreenURL\",\"" + homescreen + "\");\n";

let domains = [];
domains.push(GAIA_DOMAIN);

Gaia.webapps.forEach(function (webapp) {
  let manifest = webapp.manifest;
  let rootURL = webapp.url;

  domains.push(webapp.domain);

  let perms = manifest.permissions;
  if (perms) {
    for each(let name in perms) {
      if (!permissions[name])
        continue;

      permissions[name].urls.push(rootURL);
    }
  }
});


//XXX: only here while waiting for https://bugzilla.mozilla.org/show_bug.cgi?id=764718 to be fixed
content += "user_pref(\"dom.allow_scripts_to_close_windows\", true);\n\n";

// Probably wont be needed when https://bugzilla.mozilla.org/show_bug.cgi?id=768440 lands
content += "user_pref(\"dom.send_after_paint_to_content\", true);\n\n";

content += "user_pref(\"network.http.max-connections-per-server\", 15);\n\n";

if (LOCAL_DOMAINS) {
  content += "user_pref(\"network.dns.localDomains\", \"" + domains.join(",") + "\");\n";
}

for (let name in permissions) {
  let perm = permissions[name];
  content += "user_pref(\"" + perm.pref + "\",\"" + perm.urls.join(",") + "\");\n";
}

if (DEBUG) {
  content += "\n";
  content += "user_pref(\"marionette.defaultPrefs.enabled\", true);\n";
  content += "user_pref(\"b2g.remote-js.enabled\", true);\n";
  content += "user_pref(\"b2g.remote-js.port\", 4242);\n";
  content += "user_pref(\"javascript.options.showInConsole\", true);\n";
  content += "user_pref(\"nglayout.debug.disable_xul_cache\", true);\n";
  content += "user_pref(\"browser.dom.window.dump.enabled\", true);\n";
  content += "user_pref(\"javascript.options.strict\", true);\n";
  content += "user_pref(\"dom.report_all_js_exceptions\", true);\n";
  content += "user_pref(\"nglayout.debug.disable_xul_fastload\", true);\n";
  content += "user_pref(\"extensions.autoDisableScopes\", 0);\n";
  content += "user_pref(\"browser.startup.homepage\", \"" + homescreen + "\");\n";

  content += "user_pref(\"dom.mozBrowserFramesEnabled\", true);\n";
  content += "user_pref(\"b2g.ignoreXFrameOptions\", true);\n";
  content += "user_pref(\"dom.sms.enabled\", true);\n";
  content += "user_pref(\"dom.mozContacts.enabled\", true);\n";
  content += "user_pref(\"dom.mozSettings.enabled\", true);\n";
  content += "user_pref(\"device.storage.enabled\", true);\n";

  // Preferences for httpd
  // (Use JSON.stringify in order to avoid taking care of `\` escaping)
  content += "user_pref(\"extensions.gaia.dir\", " + JSON.stringify(GAIA_DIR) + ");\n";
  content += "user_pref(\"extensions.gaia.domain\", " + JSON.stringify(GAIA_DOMAIN) + ");\n";
  content += "user_pref(\"extensions.gaia.port\", "+ GAIA_PORT.replace(/:/g, "") + ");\n";
  content += "user_pref(\"extensions.gaia.app_src_dirs\", " + JSON.stringify(GAIA_APP_SRCDIRS) + ");\n";
  content += "user_pref(\"extensions.gaia.app_relative_path\", " + JSON.stringify(GAIA_APP_RELATIVEPATH) + ");\n";

  content += "\n";
}

let userJs = getFile(GAIA_DIR, 'profile', 'user.js');
writeContent(userJs, content);
dump("\n" + content);

