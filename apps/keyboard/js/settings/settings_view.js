'use strict';

(function(exports) {

var SettingsView = function(app, container, settingsConstructor) {
  this.app = app;
  this.container = container;
  this.SettingsConstructor = settingsConstructor;

  this.settings = null;
  this.elements = [];

  this.taskQueue = null;
};

SettingsView.prototype.start = function() {
  this.settings = new this.SettingsConstructor();
  this.settings.promiseManager = this.app.settingsPromiseManager;
  this.settings.onsettingchange = function() {
    this.taskQueue = this.taskQueue
      .then(this._updateUI.bind(this))
      .catch(function(e) { console.error(e); });
  }.bind(this);

  this.taskQueue = this.settings.initSettings()
    .then(this._updateUI.bind(this))
    .catch(function(e) { console.error(e); });

  this.settings.KEYS.forEach(function(settingKey, i) {
    var el =
      this.container.querySelector('[data-setting="' + settingKey + '"]');

    if (!el) {
      return;
    }

    this.elements[i] = el;
    el.addEventListener('change', this);
  }, this);
};

SettingsView.prototype._updateUI = function() {
  var values = this.settings.getSettingsSync();
  this.settings.KEYS.forEach(function(settingKey, i) {
    var el = this.elements[i];
    if (!el) {
      return;
    }

    el.disabled = false;

    switch (el.type) {
      case 'checkbox':
        el.checked = values[this.settings.PROPERTIES[i]];
        break;

      case 'range':
        el.value = values[this.settings.PROPERTIES[i]];
        break;

      default:
        throw 'SettingsView: UI type unimplemented.';
    }
  }, this);
};

SettingsView.prototype.handleEvent = function(evt) {
  var el = evt.target;
  var settingsKey = el.dataset.setting;

  var lock;
  var value;
  switch (el.type) {
    case 'checkbox':
      lock = this.app.closeLockManager.requestLock('stayAwake');
      value = el.checked;
      break;

    case 'range':
      lock = this.app.closeLockManager.requestLock('stayAwake');
      value = el.valueAsNumber;
      break;

    default:
      throw 'SettingsView: UI type unimplemented.';
  }

  el.disabled = true;
  this.taskQueue = this.taskQueue.then(function() {
    return this.app.settingsPromiseManager.set(settingsKey, value);
  }.bind(this)).then(function() {
    el.disabled = false;
    lock.unlock();
  }, function(e) {
    console.error(
      'SettingsView: Attempt to set setting failed', settingsKey, e);
    el.disabled = false;

    // Roll back UI
    this._updateUI();
    lock.unlock();
  }.bind(this)).catch(function(e) { console.error(e); });
};

SettingsView.prototype.stop = function() {
  this.elements.forEach(function(el) {
    if (!el) {
      return;
    }

    el.removeEventListener('change', this);
  });

  this.settings = null;
  this.elements = [];

  this.taskQueue = null;
};

exports.SettingsView = SettingsView;

})(window);
