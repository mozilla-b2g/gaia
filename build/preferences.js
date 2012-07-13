
const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, } = Components;

function getSubDirectories(directory) {
  let appsDir = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  appsDir.initWithPath(GAIA_DIR);
  appsDir.append(directory);

  let dirs = [];
  let files = appsDir.directoryEntries;
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      dirs.push(file.leafName);
    }
  }
  return dirs;
}

function getFileContent(file) {
  let fileStream = Cc['@mozilla.org/network/file-input-stream;1']
                   .createInstance(Ci.nsIFileInputStream);
  fileStream.init(file, 1, 0, false);

  let converterStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
                          .createInstance(Ci.nsIConverterInputStream);
  converterStream.init(fileStream, "utf-8", fileStream.available(),
                       Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

  let out = {};
  let count = fileStream.available();
  converterStream.readString(count, out);

  let content = out.value;
  converterStream.close();
  fileStream.close();

  return [content, count];
}

function getJSON(root, dir, name) {
  let file = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  file.initWithPath(GAIA_DIR);
  file.append(root);
  file.append(dir);
  file.append(name);

  if (!file.exists())
    return null;

  let [content, length] = getFileContent(file);
  return JSON.parse(content);
}

function writeContent(content) {
  let file = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  file.initWithPath(GAIA_DIR);
  file.append('profile');
  file.append('user.js');

  let stream = Cc["@mozilla.org/network/file-output-stream;1"]
                   .createInstance(Ci.nsIFileOutputStream);
  stream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
  stream.write(content, content.length);
  stream.close();
}


let permissions = {
  "power": {
    "urls": [],
    "pref": "dom.power.whitelist"
  },
  "sms": {
    "urls": [],
    "pref": "dom.sms.whitelist"
  },
  "contacts": {
    "urls": [],
    "pref": "dom.mozContacts.whitelist"
  },
  "telephony": {
    "urls": [],
    "pref": "dom.telephony.app.phone.url"
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
content += "user_pref(\"browser.homescreenURL\",\"" + homescreen + "\");\n";
content += "user_pref(\"browser.manifestURL\",\"" + homescreen + "/manifest.webapp\");\n\n";

let privileges = [];
let domains = [];
domains.push(GAIA_DOMAIN);

let appSrcDirs = GAIA_APP_SRCDIRS.split(' ');

appSrcDirs.forEach(function parseDirectory(directoryName) {
  let directories = getSubDirectories(directoryName);
  directories.forEach(function readManifests(dir) {
    let manifest = getJSON(directoryName, dir, "manifest.webapp");
    if (!manifest)
      return;

    let rootURL = GAIA_SCHEME + dir + "." + GAIA_DOMAIN + (GAIA_PORT ? GAIA_PORT : '');
    let domain = dir + "." + GAIA_DOMAIN;
    privileges.push(rootURL);
    domains.push(domain);

    let perms = manifest.permissions;
    if (perms) {
      for each(let name in perms) {
        if (!permissions[name])
          continue;

        permissions[name].urls.push(rootURL);

        // special case for the telephony API which needs full URLs
        if (name == 'telephony')
          if (manifest.background_page)
            permissions[name].urls.push(rootURL + manifest.background_page);
        if (manifest.attention_page)
          permissions[name].urls.push(rootURL + manifest.attention_page);
      }
    }
  });
});

//XXX: only here while waiting for https://bugzilla.mozilla.org/show_bug.cgi?id=764718 to be fixed
content += "user_pref(\"dom.allow_scripts_to_close_windows\", true);\n\n";
content += "user_pref(\"b2g.privileged.domains\", \"" + privileges.join(",") + "\");\n\n";

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
  content += "\n";
}

writeContent(content);
dump("\n" + content);

