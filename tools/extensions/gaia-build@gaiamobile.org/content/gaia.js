var Gaia = {
  _listeners: {},
  buildModules: {},
  require: null,

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
    config.LOCALE_BASEDIR = '';
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
    config.SETTINGS_PATH = ['build', 'config',
      'custom-settings.json'].join(SEP);
    config.GAIA_DISTRIBUTION_DIR = [gaiaPath, 'distribution'].join(SEP);
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
    let utils = this.buildModules['utils'];
    let ext = extensionsDir.clone();
    let src = utils.getFile(gaiaPath, 'tools', 'extensions', extName);
    let destname = extName.contains('@') ? extName : extName + '@' + domain;
    ext.append(destname);
    utils.writeContent(ext, src.path);
  },

  setup: function gaia_setup(gaiaPath) {
    var self = this;
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
      this.require = this.loadXpcshellScript(this.config,
        'xpcshell-commonjs').require;
    } catch (e) {
      throw new Error('xpcshell-commonjs doesn\'t exist, you may choose wrong' +
        ' gaia directory');
    }

    var modules = ['utils', 'preferences', 'applications-data', 'variant',
    'webapp-manifests', 'webapp-optimize', 'webapp-zip', 'settings'];
    modules.forEach(function(m) { self.buildModules[m] = self.require(m); });

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
    this.buildModules['preferences'].execute(config);
    this.buildModules['applications-data'].execute(config);
    this.buildModules['webapp-manifests'].execute(config);
    this.buildModules['settings'].execute(config);

    // Install all helper addons
    let extensions = this.profile.clone();
    extensions.append('extensions');
    this.buildModules['utils'].ensureFolderExists(extensions);

    let exts = ['desktop-helper', 'browser-helper@gaiamobile.org', 'httpd'];
    exts.forEach(function(ext) {
      self.installExtension(extensions, config.GAIA_DIR, ext,
        config.GAIA_DOMAIN);
    });
  },

  launch: function gaia_launch() {
    // Launch firefox with the custom profile
    let firefox = Cc['@mozilla.org/file/directory_service;1']
                    .getService(Ci.nsIProperties).get('XREExeF', Ci.nsIFile);
    let process = Cc['@mozilla.org/process/util;1']
                    .createInstance(Ci.nsIProcess);
    process.init(firefox);
    let args = ['-no-remote', '-profile', this.config.PROFILE_DIR];
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
