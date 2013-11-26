'use strict';

const CC = Components.Constructor;
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const PAGE_MAX_APP = 16;
const DOCK_MAX_APP = 5;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

const GAIA_DIR_PREF_NAME = 'extensions.gaia.dir';
const DEFAULT_PAGE = 2;
var require, buildModules = {};

var Homescreen = {

  init: function hs_init() {
    var self = this;
    this.addPageButton = document.getElementById('add-page');
    this.grid = document.getElementById('grid');
    this.dock = document.getElementById('dock');
    this.apps = [];
    this.addPageButton.addEventListener('click', this.addPage.bind(this));

    if (this.grid.children.length <= 1) {
      for (var i = 0; i < DEFAULT_PAGE; i++) {
        this.addPage();
      }
    }

    var gaiaBuilds = document.getElementById('gaia-builds');
    gaiaBuilds.addEventListener('change', function(evt) {
      var selected = gaiaBuilds.options[gaiaBuilds.options.selectedIndex];
      self.selectBuild(selected.value);
    });
    document.getElementById('save').addEventListener('click',
      this.save.bind(this));
    document.getElementById('select-gaia').addEventListener('click',
      this.selectGaiaFolder.bind(this));
    document.getElementById('options-remove').addEventListener('click',
      this.removeApp.bind(this));
    document.getElementById('reset-gaia').addEventListener('click',
      resetGaiaPath);
  },

  selectBuild: function hs_selectBuild(buildname) {
    if (!this.gaiaConfig) {
      throw new Error('Homescreen.gaiaConfig doesn\'t exist');
    }
    var c = this.gaiaConfig;
    var {getAppsByList} = buildModules.utils;
    var apps = getAppsByList(this.buildConfig[buildname].content,
      c.GAIA_DIR, c.GAIA_DISTRIBUTION_DIR);
    this.setApps(apps);
  },

  selectGaiaFolder: function hs_selectGaiaFolder() {
    this.reset();
    let path = this.promptFolder();
    if (!path) {
      return;
    }
    Services.prefs.setCharPref(GAIA_DIR_PREF_NAME, path);
  },

  promptFolder: function hs_promptFolder() {
    let fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
    fp.init(window, 'Select Gaia directory', Ci.nsIFilePicker.modeGetFolder);
    let res = fp.show();
    if (res != Ci.nsIFilePicker.returnCancel) {
      return fp.file.path;
    }
    return null;
  },

  reset: function hs_reset() {
    var availableApps = document.getElementById('available-apps');
    while (availableApps.firstChild) {
      availableApps.removeChild(availableApps.firstChild);
    }

    var pages = document.getElementsByClassName('container');
    Array.prototype.forEach.call(pages, function(page, index) {
      while (page.firstChild) {
        page.removeChild(page.firstChild);
      }
    });
  },

  resetBuilds: function hs_resetBuilds() {
    var builds = document.getElementById('gaia-builds');
    Array.prototype.forEach.call(builds.children, function(option) {
      option.remove();
    });
  },

  setApps: function hs_setApps(apps) {
    this.installedApps = {};
    var availableApps = document.getElementById('available-apps');
    this.apps = apps;
    this.reset();

    for (var app in apps) {
      // app with role in manifest means it has specific purpose and those apps
      // usually doesn't show on homescreen. e.g., role of bluetooth, pdf.js &
      // ringtones is "system" which means they are executed by another apps but
      // doesn't show on homescreen, but those apps are essential for gaia .
      if (apps[app].manifest.role) {
        this.installedApps[app] = apps[app];
        continue;
      } else {
        this.createAppElements(apps[app]).forEach(function(el) {
          availableApps.appendChild(el);
        });
      }
    }
  },

  showOptions: function hs_showOptions(evt) {
    this.editingAppElement = evt.target;
    document.getElementById('options-title').innerHTML = evt.target.innerHTML;
    window.location.hash = '#options';
  },

  removeApp: function hs_removeApp() {
    if (!this.editingAppElement) {
      throw new Error('You didn\'t select an app to edit');
    }

    var name = this.editingAppElement.innerHTML;
    var availableApps = document.getElementById('available-apps');
    availableApps.appendChild(this.createApp(name));
    this.editingAppElement.remove();
    delete this.editingAppElement;

    window.location.hash = '';
  },

  addToPage: function hs_addToPage(evt) {
    var selectedPage =
      document.querySelector('input[type=radio]:checked ~ .container');
    var app = this.createApp(evt.target.dataset.name,
      evt.target.dataset.entryPoint, true);
    var max = selectedPage.parentElement.id === 'dock' ?
      DOCK_MAX_APP : PAGE_MAX_APP;
    if (selectedPage.children.length < max) {
      selectedPage.appendChild(app);
      evt.target.remove();
    } else {
      alert('can\'t add anymore');
    }
  },

  createAppElements: function hs_createAppElements(app) {
    function logMissingIcon(app, entryPoint) {
      var name = app + (entryPoint ? ':' + entryPoint : '');
      console.warn('icons for ' + name + ' doesn\'t exist');
    }
    var elements = [];
    if (!app.manifest.icons && !app.manifest.entry_points) {
      logMissingIcon(app.name);
    } else if (!app.manifest.entry_points && app.manifest.icons) {
      elements.push(this.createApp(app.name));
    } else {
      for (var entryPoint in app.manifest.entry_points) {
        if (!app.manifest.entry_points[entryPoint].icons) {
          logMissingIcon(app.name, entryPoint);
          continue;
        }
        elements.push(this.createApp(app.name, entryPoint));
      }
    }

    return elements;
  },

  createApp: function hs_createApp(appname, entryPoint, inPage) {
    var div = document.createElement('div');
    div.classList.add('app');
    div.innerHTML = appname;
    div.dataset.name = appname;
    if (entryPoint) {
      div.innerHTML += ':' + entryPoint;
      div.dataset.entryPoint = entryPoint;
    }

    if (!inPage) {
      div.addEventListener('click', this.addToPage.bind(this));
    } else {
      div.addEventListener('click', this.showOptions.bind(this));
    }
    return div;
  },

  setBuildConfig: function hs_setBuildConfig(config) {
    this.reset();
    this.buildConfig = config;
    var buildsElement = document.getElementById('gaia-builds');
    for (var build in config) {
      var option = document.createElement('option');
      option.setAttribute('value', build);
      option.innerHTML = build;

      if (build === 'production') {
        option.setAttribute('selected', 'selected');
        this.selectBuild(build);
      }
      buildsElement.appendChild(option);
    }
  },

  addPage: function hs_addPage() {
    var self = this;
    var lastInput =
      document.querySelector('#grid > div:nth-last-child(2) > input');
    var lastId = lastInput ? parseInt(lastInput.id.substr('page'.length)) : 0;
    var page = document.createElement('div');
    page.classList.add('page');

    var input = document.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('name', 'page-selection');
    input.id = 'page' + (lastId + 1);

    var label = document.createElement('label');
    label.setAttribute('for', input.id);

    var closeBtn = document.createElement('div');
    closeBtn.classList.add('close-button');
    closeBtn.innerHTML = '×';

    closeBtn.addEventListener('click', function(evt) {
      var targetPage = evt.target.parentNode;
      var targetInput = targetPage.getElementsByTagName('input')[0];
      if (targetInput.checked) {
        document.getElementById('page0').checked = true;
      }

      var apps = targetPage.querySelectorAll('.app');
      var availableApps = document.getElementById('available-apps');
      Array.prototype.forEach.call(apps, function(app) {
        var {name, entryPoint} = app.dataset;
        var restoredApp = self.createApp(name, entryPoint);
        availableApps.appendChild(restoredApp);
      });

      targetPage.remove();
    });

    var container = document.createElement('div');
    container.classList.add('container');

    page.appendChild(closeBtn);
    page.appendChild(input);
    page.appendChild(label);
    page.appendChild(container);

    this.grid.insertBefore(page, this.addPageButton);
  },

  save: function hs_save(evt) {
    var self = this;
    if (!buildModules.utils) {
      throw new Error('utils module doesn\'t exist');
    }

    var utils = buildModules.utils;
    var distDir = utils.getFile(this.gaiaConfig.GAIA_DISTRIBUTION_DIR);
    utils.ensureFolderExists(distDir);

    var pages = document.querySelectorAll('div.page > div.container');
    var grid = {
      homescreens: [],
      search_page: { enabled: true }
    };

    //FIXME: we don't support collections for now
    var collections = [
      ['apps/homescreen/collections', 'social'],
      ['apps/homescreen/collections', 'games'],
      ['apps/homescreen/collections', 'music'],
      ['apps/homescreen/collections', 'entertainment']
    ];
    grid.homescreens.push(collections);

    Array.prototype.forEach.call(pages, function(page, index) {
      var pageArray = [];
      Array.prototype.forEach.call(page.children, function(el) {
        var parent;
        var appname = el.dataset.name;
        var entryPoint = el.dataset.entryPoint;

        if (!self.apps[appname]) {
          throw new Error('App doesn\'t exist: ' + appname);
        }

        var f = utils.getFile(self.apps[appname].path);
        parent = f.parent.leafName;

        var appArray = [parent, appname];
        if (entryPoint) {
          appArray.push(entryPoint);
        }
        pageArray.push(appArray);
        self.installedApps[appname] = self.apps[appname];
      });

      if (index !== pages.length - 1) {
        grid.homescreens.push(pageArray);
      } else {
        // insert apps in dock to first one element of pageArray
        grid.homescreens.splice(0, 0, pageArray);
      }
    });

    var appslistFile = distDir.clone();
    appslistFile.append('apps.list');

    var applistArray = [];
    for (var key in self.installedApps) {
      applistArray.push(self.installedApps[key].parent + '/' + key);
    }

    utils.writeContent(appslistFile, applistArray.join('\n'));

    var homescreenFile = distDir.clone();
    homescreenFile.append('homescreens.json');
    utils.writeContent(homescreenFile, JSON.stringify(grid, undefined, 2));

    // open directory in file manager if click save button
    if (evt && evt.target) {
      distDir.launch();
    }
  }
};

var Gaia = {
  _listeners: {},

  loadXpcshellScript: function gaia_loadXpcshellScript(config, name) {
    let module =
      Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal());
    for (var i in config) {
      module[i] = config[i];
    }
    Services.scriptloader.loadSubScript(
      'file:///' + config.GAIA_DIR.replace(/\\/g, '/') + '/build/' + name +
      '.js', module
    );
    return module;
  },

  getAppDirs: function gaia_getAppDirs(gaiaPath) {
    let dir = new FileUtils.File(gaiaPath);
    dir.append('apps');
    let files = dir.directoryEntries;
    let apps = [];
    while (files.hasMoreElements()) {
      let file = files.getNext().QueryInterface(Ci.nsILocalFile);
      if (file.isDirectory()) {
        apps.push(file.path);
      }
    }
    return apps;
  },

  getConfig: function gaia_getConfig(profilePath, gaiaPath) {
    let os = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULRuntime).OS;
    const SEP = os === 'WINNT' ? '\\' : '/';
    let config = {};
    config.GAIA_DIR = gaiaPath;
    config.PROFILE_DIR = profilePath;
    config.PROFILE_FOLDER = 'profile-debug';
    config.GAIA_SCHEME = 'http://';
    config.GAIA_DOMAIN = 'gaiamobile.org';
    config.DEBUG = 1;
    config.DEVICE_DEBUG = 0;
    config.LOCAL_DOMAINS = 1;
    config.DESKTOP = 1;
    config.HOMESCREEN = config.GAIA_SCHEME + 'system.' + config.GAIA_DOMAIN;
    config.GAIA_PORT = ':8080';
    config.GAIA_LOCALES_PATH = 'locales';
    config.LOCALES_FILE = 'shared/resources/languages.json';
    config.BUILD_APP_NAME = '*';
    config.PRODUCTION = '0';
    config.GAIA_OPTIMIZE = '0';
    config.GAIA_DEV_PIXELS_PER_PX = '1';
    config.DOGFOOD = '0';
    config.OFFICIAL = '';
    config.GAIA_DEFAULT_LOCALE = 'en-US';
    config.GAIA_INLINE_LOCALES = '1';
    config.GAIA_CONCAT_LOCALES = '1';
    config.GAIA_ENGINE = 'xpcshell';
    config.TARGET_BUILD_VARIANT = '';
    config.NOFTU = '1';
    config.REMOTE_DEBUGGER = '0';
    config.SETTINGS_PATH = 'build/custom-settings.json';
    config.GAIA_DISTRIBUTION_DIR = gaiaPath + SEP + 'distribution';
    config.GAIA_BUILD_DIR = 'file://' + gaiaPath + '/build/';
    config.GAIA_KEYBOARD_LAYOUTS = 'en,pt-BR,es,de,fr,pl';
    return config;
  },

  getTmpFolder: function gaia_getTmpFolder(name) {
    let file = Cc['@mozilla.org/file/directory_service;1']
                 .getService(Ci.nsIProperties).get('TmpD', Ci.nsIFile);
    file.append(name);
    file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, parseInt('0777', 8));
    return file;
  },

  installExtension: function gaia_installExtension(extensionsDir, gaiaPath,
    extName, domain) {
    let utils = buildModules['utils'];
    let ext = extensionsDir.clone();
    let src = utils.getFile(gaiaPath, 'tools', 'extensions', extName);
    let destname = extName.contains('@') ? extName : extName + '@' + domain;
    ext.append(destname);
    utils.writeContent(ext, src.path);
  },

  setup: function gaia_setup(gaiaPath) {
    if (!gaiaPath) {
      throw new Error('gaiaPath is empty');
    }

    this.profile = this.getTmpFolder('gaia');

    // Generate global variables required by build scripts
    try {
      this.config = this.getConfig(this.profile.path, gaiaPath);
    } catch (e) {
      var msg = 'Can\'t load Gaia configuration, You may choose wrong gaia' +
        ' directory';
      throw new Error(msg);
    }

    try {
      require = this.loadXpcshellScript(this.config,
        'xpcshell-commonjs').require;
    } catch (e) {
      throw new Error('xpcshell-commonjs doesn\'t exist, you may choose wrong' +
        ' gaia directory');
    }

    var modules = ['utils', 'preferences', 'applications-data',
    'webapp-manifests', 'webapp-optimize', 'webapp-zip', 'settings'];
    modules.forEach(function(m) { buildModules[m] = require(m); });

    var evt = new CustomEvent('setupFinished');
    this.dispatchEvent(evt);
  },

  install: function gaia_install() {
    var self = this;
    if (!this.config || !this.profile) {
      throw new Error('config or profile doesn\'t exist');
    }
    var config = this.config;

    // Execute all parts of the build system
    buildModules['preferences'].execute(config);
    buildModules['applications-data'].execute(config);
    buildModules['webapp-manifests'].execute(config);
    buildModules['settings'].execute(config);

    // Install all helper addons
    let extensions = this.profile.clone();
    extensions.append('extensions');
    buildModules['utils'].ensureFolderExists(extensions);

    let exts = ['desktop-helper', 'browser-helper@gaiamobile.org', 'httpd'];
    exts.forEach(function(ext) {
      self.installExtension(extensions, config.GAIA_DIR, ext,
        config.GAIA_DOMAIN);
    });

    // Launch firefox with the custom profile
    let firefox = Cc['@mozilla.org/file/directory_service;1']
                    .getService(Ci.nsIProperties).get('XREExeF', Ci.nsIFile);
    let process = Cc['@mozilla.org/process/util;1']
                    .createInstance(Ci.nsIProcess);
    process.init(firefox);
    let args = ['-no-remote', '-profile', config.PROFILE_DIR];
    process.run(false, args, args.length);
  },

  addEventListener: function gaia_addEventListener(type, listener) {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(listener);
  },

  removeEventListener: function gaia_removeEventListener(type, listener) {
    if (this._listeners[type]) {
      this._listeners[type].every(function(li, index) {
        if (li === listener) {
          this._listeners.splice(index, 1);
          return false;
        }
        return true;
      });
    }
  },

  dispatchEvent: function gaia_dispatchEvent(event) {
    if (this._listeners[event.type]) {
      this._listeners[event.type].forEach(function(listener) {
        listener(event);
      });
    }
  }
};

function resetGaiaPath() {
  Homescreen.resetBuilds();
  Services.prefs.setCharPref(GAIA_DIR_PREF_NAME, '');
  window.location.hash = '#gaia-path-lightbox';
}

window.addEventListener('load', function() {
  Homescreen.init();

  Gaia.addEventListener('setupFinished', function() {
    Homescreen.gaiaConfig = Gaia.config;
    var {getFile, getBuildConfig} = buildModules.utils;
    var configs = getBuildConfig(getFile(Gaia.config.GAIA_DIR, 'build').path);
    Homescreen.setBuildConfig(configs);
  });

  var observer = {
    observe: function(subject, topic, data) {
      if (data !== GAIA_DIR_PREF_NAME) {
        return;
      }
      var gaiaPath = Services.prefs.getCharPref(GAIA_DIR_PREF_NAME);

      if (!gaiaPath) {
        return;
      }
      try {
        Gaia.setup(gaiaPath);
        window.location.hash = '';
      } catch (e) {
        alert(e.message);
        resetGaiaPath();
      }
    }
  };

  Services.prefs.addObserver(GAIA_DIR_PREF_NAME, observer, false);

  document.getElementById('launch').addEventListener('click', function(evt) {
    Homescreen.save();
    var installedAppPaths = [];
    for (var key in Homescreen.installedApps) {
      installedAppPaths.push(Homescreen.installedApps[key].path);
    }

    var original = evt.target.textContent;
    evt.target.textContent = 'Building gaia... please wait.';
    setTimeout(function() {
      if (!Services.prefs.prefHasUserValue(GAIA_DIR_PREF_NAME)) {
        Homescreen.selectGaiaFolder();
      }
      Gaia.profile.remove(true);
      buildModules.utils.ensureFolderExists(Gaia.profile);
      Gaia.config.GAIA_APPDIRS = installedAppPaths.join(' ');
      Gaia.install();
      evt.target.textContent = original;
    }, 100);
  });
  if (Services.prefs.prefHasUserValue(GAIA_DIR_PREF_NAME)) {
    var gaiaPath = Services.prefs.getCharPref(GAIA_DIR_PREF_NAME);
    if (gaiaPath) {
      try {
        Gaia.setup(gaiaPath);
      } catch (e) {
        alert(e.message);
        resetGaiaPath();
      }
    } else {
      resetGaiaPath();
    }
  } else {
    resetGaiaPath();
  }
});

// FIXME: this is a workaround because we can't use <a href="#something"> to
// apply hash tag to url if using about:gaia.
if (window.location.href === 'about:gaia') {
  window.location = 'chrome://gaia-build/content/aboutGaia.html';
}
