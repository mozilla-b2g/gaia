'use strict';

/**
 * InputAppListSettings is reponsible for collecting and keep track of settings
 * needed by InputAppList.
 */
(function(exports) {

var InputApp = function(domApp, dynamicInputs) {
  this.domApp = domApp;
  this.dynamicInputs = dynamicInputs || {};

  if (!this.domApp.manifest) {
    throw new Error(
      'InputApp: should not be constructed before DOMApplication ' +
      'has manifest ready.');
  }
};

InputApp.prototype.getInputs = function() {
  var dict = {};
  var inputId;
  for (inputId in this.domApp.manifest.inputs) {
    dict[inputId] = this.domApp.manifest.inputs[inputId];
  }
  for (inputId in this.dynamicInputs) {
    if (inputId in dict) {
      // Staticly declaired?
      break;
    }

    dict[inputId] = this.dynamicInputs[inputId];
    dict[inputId].isDynamic = true;
  }

  return dict;
};

var InputAppListSettings = function() {
  this._values = {
    enable3rdPartyApps: undefined,
    dynamicInputs: undefined
  };

  this._bindCallback = null;

  this.ready = false;
  this._promise = null;
};

InputAppListSettings.prototype.onchange = null;

InputAppListSettings.prototype.SETTINGS_KEY_THIRD_PARTY_APP_ENABLED =
  'keyboard.3rd-party-app.enabled';
InputAppListSettings.prototype.SETTINGS_KEY_DYNAMIC_INPUTS =
  'keyboard.dynamic-inputs';

InputAppListSettings.prototype.start = function() {
  if (navigator.mozSettings) {
    // We need to keep this so we could removeObserver()
    this._bindCallback = this.callback.bind(this);
    navigator.mozSettings.addObserver(
      this.SETTINGS_KEY_THIRD_PARTY_APP_ENABLED, this._bindCallback);
    navigator.mozSettings.addObserver(
      this.SETTINGS_KEY_DYNAMIC_INPUTS, this._bindCallback);
  }

  this.getSettings().then(function() {
    this.ready = true;
  }.bind(this));
};

InputAppListSettings.prototype.getSettings = function() {
  if (this.ready) {
    return this.getSettingsSync();
  }

  return this.getSettingsAsync();
};

InputAppListSettings.prototype.getSettingsSync = function() {
  if (!this.ready) {
    console.warn('getSettingsSync: getSettingsSync called before ready.');
  }

  return this._values;
};

InputAppListSettings.prototype.getSettingsAsync = function() {
  if (this._promise) {
    return this._promise;
  }

  var lock = navigator.mozSettings.createLock();

  var p = this._promise = Promise.all([
    lock.get(this.SETTINGS_KEY_THIRD_PARTY_APP_ENABLED),
    lock.get(this.SETTINGS_KEY_DYNAMIC_INPUTS)])
    .then(function(values) {
      this._values.enable3rdPartyApps =
        values[0][this.SETTINGS_KEY_THIRD_PARTY_APP_ENABLED];
      this._values.dynamicInputs =
        values[1][this.SETTINGS_KEY_DYNAMIC_INPUTS];

      return this._values;
    }.bind(this))
    .catch(function(e) {
      console.error('InputAppListSettings: Fail to get setting.', e);
      this._promise = null;
      this._values.enable3rdPartyApps = false;
      this._values.dynamicInputs = {};

      return this._values;
    }.bind(this));

  return p;
};

// Callback for mozSettings.addObserver()
InputAppListSettings.prototype.callback = function(obj) {
  switch (obj.settingName) {
    case this.SETTINGS_KEY_THIRD_PARTY_APP_ENABLED:
      this._values.enable3rdPartyApps = obj.settingValue;
      break;

    case this.SETTINGS_KEY_DYNAMIC_INPUTS:
      this._values.dynamicInputs = obj.settingValue;
      break;
  }

  if (typeof this.onchange === 'function') {
    this.onchange(this._values);
  }
};

InputAppListSettings.prototype.stop = function() {
  this._values = {
    enable3rdPartyApps: undefined,
    dynamicInputs: undefined
  };

  this.ready = false;
  this._promise = null;

  if (navigator.mozSettings) {
    navigator.mozSettings.removeObserver(
      this.SETTINGS_KEY_THIRD_PARTY_APP_ENABLED, this._bindCallback);
    navigator.mozSettings.removeObserver(
      this.SETTINGS_KEY_DYNAMIC_INPUTS, this._bindCallback);
    this._bindCallback = null;
  }
};

/**
 * InputAppList takes app registry and settings to generate a list of available
 * input apps.
 */
var InputAppList = function() {
  this.ready = false;
  this._inputApps = null;

  this.settings = null;

  this._getListPromise = null;
};

InputAppList.prototype.onready = null;
InputAppList.prototype.onupdate = null;

InputAppList.prototype.SETTINGS_KEY_THIRD_PARTY_APP_ENABLED =
  'keyboard.3rd-party-app.enabled';

InputAppList.prototype.start = function() {
  if (navigator.mozApps && navigator.mozApps.mgmt) {
    navigator.mozApps.mgmt.addEventListener('install', this);
    navigator.mozApps.mgmt.addEventListener('uninstall', this);
  }

  this.settings = new InputAppListSettings();
  this.settings.onchange = this._refresh.bind(this);
  this.settings.start();

  this.getList().then(function() {
    this.ready = true;

    if (typeof this.onready === 'function') {
      return this.onready(this._inputApps);
    }
  }.bind(this)).catch(function(e) {
    console.error(e);
  });
};

InputAppList.prototype.getList = function() {
  if (this._getListPromise) {
    return this._getListPromise;
  }

  var p = this._getListPromise =
    Promise.all([this.settings.getSettings(), this._getAllApps()])
    .then(this._setInputApps.bind(this))
    .then(function() {
      return this._inputApps;
    }.bind(this))
    .catch(function(e) {
      this._getListPromise = null;

      console.error(e);
    }.bind(this));

  return p;
};

InputAppList.prototype.getListSync = function() {
  if (!this.ready) {
    console.warn('InputAppList: getListSync called when list is not ready.');
  }

  return this._inputApps;
};

InputAppList.prototype.handleEvent = function(evt) {
  var updated = false;

  switch (evt.type) {
    case 'install':
      var app = evt.application;
      if (app.downloading) {
        // App is currently being downloaded;
        // wait for download to complete as manifest is not available now.
        app.addEventListener('downloadsuccess', this);
        return;
      }

      updated = this._addInputApp(app);

      break;

    case 'downloadsuccess':
      updated = this._addInputApp(evt.target);

      break;

    case 'uninstall':
      updated = this._removeInputApp(evt.application);

      break;
  }

  if (updated && typeof this.onupdate === 'function') {
    this.onupdate(this._inputApps);
  }
};

InputAppList.prototype.stop = function() {
  this.ready = false;
  this._inputApps = null;

  this.settings = null;

  this._getListPromise = null;

  if (navigator.mozApps && navigator.mozApps.mgmt) {
    navigator.mozApps.mgmt.removeEventListener('install', this);
    navigator.mozApps.mgmt.removeEventListener('uninstall', this);
  }
};

InputAppList.prototype._getAllApps = function() {
  if (!navigator.mozApps || !navigator.mozApps.mgmt) {
    console.error('InputAppList: mozApps.mgmt not available.');

    return [];
  }

  return Promise.resolve(navigator.mozApps.mgmt.getAll())
    .catch(function(e) {
      console.error('InputAppList: Fail to get app list.', e);
      return [];
    });
};

InputAppList.prototype._setInputApps = function(values) {
  var apps = values[1];
  var dynamicInputs = this.settings.getSettingsSync().dynamicInputs || {};

  var inputApps = apps.filter(this._isInputApp, this).map(function(domApp) {
    var inputApp = new InputApp(domApp, dynamicInputs[domApp.manifestURL]);

    return inputApp;
  });

  if (inputApps.length === 0) {
    console.error('InputAppList: No input apps installed?');
  }

  this._inputApps = inputApps;
};

InputAppList.prototype._addInputApp = function(domApp) {
  if (!this._isInputApp(domApp)) {
    return false;
  }

  this._inputApps.push(new InputApp(domApp));

  return true;
};

InputAppList.prototype._removeInputApp = function(domApp) {
  var index = this._inputApps.findIndex(function(appInList) {
    return (appInList.domApp.manifestURL === domApp.manifestURL);
  });

  if (index === -1) {
    return false;
  }

  this._inputApps.splice(index, 1);

  return true;
};

InputAppList.prototype._isInputApp = function(domApp) {
  if (!domApp.manifest || 'input' !== domApp.manifest.role) {
    return false;
  }

  // Check app type
  if (domApp.manifest.type !== 'certified' &&
      domApp.manifest.type !== 'privileged') {
    return false;
  }

  var settingValues = this.settings.getSettingsSync();
  if (!settingValues.enable3rdPartyApps &&
       domApp.manifest.type !== 'certified') {
    console.warn('InputAppList: ' +
      'A 3rd-party input app is installed but the feature is not enabled.',
      domApp.manifestURL);

    return false;
  }

  // Check permission
  // TODO: Maybe we shouldn't be checking permission ourselves?
  if (domApp.manifest.permissions &&
      (typeof domApp.manifest.permissions.input !== 'object')) {
    return false;
  }

  if (typeof domApp.manifest.inputs !== 'object') {
    return false;
  }

  return true;
};

InputAppList.prototype._refresh = function() {
  this._getListPromise = null;

  this.getList().then(function() {
    if (typeof this.onupdate === 'function') {
      return this.onupdate(this._inputApps);
    }
  }.bind(this)).catch(function(e) {
    console.error(e);
  });
};

exports.InputAppListSettings = InputAppListSettings;
exports.InputAppList = InputAppList;
exports.InputApp = InputApp;

}(window));
