const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

const GAIA_DIR_PREF_NAME = "extensions.gaia.dir";

function loadXpcshellScript(config, name) {
  let module = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal());
  for(var i in config)
    module[i] = config[i];
  Services.scriptloader.loadSubScript(
    'file:///' + config.GAIA_DIR.replace(/\\/g, "/") + '/build/utils.js',
    module
  );
  if (name === 'utils')
    return module;
  Services.scriptloader.loadSubScript(
    'file:///' + config.GAIA_DIR.replace(/\\/g, "/") + '/build/' + name + '.js',
    module
  );
  return module;
}

function getAppDirs(gaia_path) {
  let dir = new FileUtils.File(gaia_path);
  dir.append("apps");
  let files = dir.directoryEntries;
  let apps = [];
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    apps.push(file.path);
  }
  return apps;
}

function getConfig(profilePath, gaiaPath) {
  let config = {};
  config.GAIA_DIR = gaiaPath;
  config.PROFILE_DIR = profilePath;
  config.PROFILE_FOLDER = "profile";
  config.GAIA_SCHEME = "http://";
  config.GAIA_DOMAIN = "gaiamobile.org";
  config.DEBUG = "1";
  config.DEVICE_DEBUG = "";
  config.LOCAL_DOMAINS = "1";
  config.DESKTOP = "1";
  config.HOMESCREEN = config.GAIA_SCHEME + 'system.' + config.GAIA_DOMAIN;;
  config.GAIA_PORT = ":8080";
  config.GAIA_LOCALES_PATH = "";
  config.LOCALES_FILE = "shared/resources/languages.json";
  config.BUILD_APP_NAME = "*";
  config.PRODUCTION = "";
  config.GAIA_OPTIMIZE = "";
  config.GAIA_DEV_PIXELS_PER_PX = "1";
  config.DOGFOOD = "1";
  config.OFFICIAL = "";
  config.GAIA_DEFAULT_LOCALE = "en-US";
  config.GAIA_INLINE_LOCALES = "1";
  config.GAIA_CONCAT_LOCALES = "1";
  config.GAIA_ENGINE = "xpcshell";
  config.TARGET_BUILD_VARIANT = "eng";
  config.NOFTU = "1";
  config.REMOTE_DEBUGGER = "";
  config.SETTINGS_PATH = "build/custom-settings.json";
  config.GAIA_DISTRIBUTION_DIR = gaiaPath + "\\distribution";
  config.GAIA_APPDIRS = getAppDirs(gaiaPath).join(" ");
  return config;
}

function getTmpFolder(name) {
  let file = Cc["@mozilla.org/file/directory_service;1"]
               .getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile);
  file.append(name);
  file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, parseInt("0666", 8));
  return file;
}

function setup(gaiaPath) {
  let profile = getTmpFolder("gaia");

  // Generate global variables required by build scripts
  let config = getConfig(profile.path, gaiaPath);

  let utilsModule = loadXpcshellScript(config, 'utils');

  // Execute all parts of the build system
  let prefModule = loadXpcshellScript(config, 'preferences');
  let manifestModule = loadXpcshellScript(config, 'webapp-manifests');
  let optimizeModule = loadXpcshellScript(config, 'webapp-optimize');
  let zipModule = loadXpcshellScript(config, 'webapp-zip');
  let settingsModule = loadXpcshellScript(config, 'settings');

  // Install all helper addons
  let extensions = profile.clone();
  extensions.append("extensions");
  utilsModule.ensureFolderExists(extensions);

  let desktopHelper = extensions.clone();
  desktopHelper.append("desktop-helper@gaiamobile.org");
  utilsModule.writeContent(desktopHelper, gaiaPath + "\\tools\\extensions\\desktop-helper");

  let browserHelper = extensions.clone();
  browserHelper.append("browser-helper@gaiamobile.org");
  utilsModule.writeContent(browserHelper, gaiaPath + "\\tools\\extensions\\browser-helper@gaiamobile.org");

  let httpd = extensions.clone();
  httpd.append("httpd@gaiamobile.org");
  utilsModule.writeContent(httpd, gaiaPath + "\\tools\\extensions\\httpd");

  // Launch firefox with the custom profile
  let firefox = Cc['@mozilla.org/file/directory_service;1']
                  .getService(Ci.nsIProperties).get('XREExeF', Ci.nsIFile);
  let process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
  process.init(firefox);
  let args = ["-no-remote", "-profile", config.PROFILE_DIR];
  process.run(false, args, args.length);
}

function promptFolder() {
  let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  fp.init(window, "Select Gaia directory", Ci.nsIFilePicker.modeGetFolder);
  let res = fp.show();
  if (res != Ci.nsIFilePicker.returnCancel)
    return fp.file.path;
  return null;
}

function selectGaiaFolder() {
  let path = promptFolder();
  if (!path) {
    return;
  }
  Services.prefs.setCharPref(GAIA_DIR_PREF_NAME, path);
  let input = document.getElementById("gaia_path");
  input.value = path;
}

window.onload = function () {
  let select = document.getElementById("select_gaia");
  select.onclick = selectGaiaFolder;
  let launch = document.getElementById("launch");
  launch.onclick = function () {
    launch.textContent = "Building gaia... please wait.";
    setTimeout(function () {
      if (!Services.prefs.prefHasUserValue(GAIA_DIR_PREF_NAME)) {
        selectGaiaFolder();
      }
      let path = Services.prefs.getCharPref(GAIA_DIR_PREF_NAME);
      setup(path);
      launch.textContent = "Launch gaia";
    }, 100);
  };
  if (Services.prefs.prefHasUserValue(GAIA_DIR_PREF_NAME)) {
    let input = document.getElementById("gaia_path");
    input.value = Services.prefs.getCharPref(GAIA_DIR_PREF_NAME);
  }
};
