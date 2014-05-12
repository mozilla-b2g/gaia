'use strict';

/* global Promise */

(function(exports) {

/**
 * SettingsPromiseManager wraps Settings API into methods and return Promises,
 * so we can easily mix and match these async actions.
 *
 * It also manages the lock for us.
 *
 */
var SettingsPromiseManager = function SettingsPromiseManager() {
  this._readLock = null;
  this._writeLock = null;
};

SettingsPromiseManager.prototype._cleanLock = function(type) {
  var propName = '_' + type + 'Lock';

  // If there is a close lock, remove it.
  if (this[propName] && this[propName].closed) {
    this[propName] = null;
  }
};

SettingsPromiseManager.prototype._getLock = function(type) {
  var propName = '_' + type + 'Lock';

  // If there is a lock present we return that
  if (this[propName] && !this[propName].closed) {
    return this[propName];
  }

  // If there isn't we return one.
  var settings = window.navigator.mozSettings;
  this[propName] = settings.createLock();

  return this[propName];
};

SettingsPromiseManager.prototype._getReadLock = function() {
  return this._getLock('read');
};

SettingsPromiseManager.prototype._getWriteLock = function() {
  return this._getLock('write');
};

SettingsPromiseManager.prototype.get = function(obj) {
  if (typeof obj === 'string') {
    return this.getOne(obj);
  }

  if (typeof obj !== 'object') {
    throw new Error('SettingsPromiseManager.get: ' +
      'require object, array, or string.');
  }

  var arr = Array.isArray(obj) ? obj : Object.keys(obj);
  var promise = Promise.all(arr.map(function(key) {
    return this.getOne(key);
  }, this));

  return promise;
};

SettingsPromiseManager.prototype.getOne = function(key) {
  var promise = new Promise(function(resolve, reject) {
    var req = this._getReadLock().get(key);
    req.onsuccess = function() {
      this._cleanLock('read');
      resolve(req.result[key]);
    }.bind(this);
    req.onerror = function() {
      this._cleanLock('read');
      reject();
    }.bind(this);
  }.bind(this));

  return promise;
};

SettingsPromiseManager.prototype.set = function(obj, value) {
  if (typeof obj === 'string') {
    return this.setOne(obj, value);
  }

  if (typeof obj !== 'object') {
    throw new Error('SettingsPromiseManager.set: require object.');
  }

  var promise = new Promise(function(resolve, reject) {
    var req = this._getWriteLock().set(obj);
    req.onsuccess = function() {
      this._cleanLock('write');
      resolve();
    }.bind(this);
    req.onerror = function() {
      this._cleanLock('write');
      reject();
    }.bind(this);
  }.bind(this));

  return promise;
};

SettingsPromiseManager.prototype.setOne = function(key, value) {
  var obj = {};
  obj[key] = value;
  return this.set(obj);
};

var SettingsManagerBase = function() {
  this._callbacks = null;
};

SettingsManagerBase.prototype.onsettingchange = null;

SettingsManagerBase.prototype.KEYS = [];
SettingsManagerBase.prototype.PROPERTIES = [];

SettingsManagerBase.prototype.initSettings = function() {
  var promise = new Promise(function(resolve, reject) {
    this.promiseManager.get(this.KEYS)
    .then(function(results) {
      results.forEach(function(value, i) {
        this[this.PROPERTIES[i]] = value;
      }, this);

      this.startObserve();

      resolve();
    }.bind(this),
    reject);
  }.bind(this));

  return promise;
};

SettingsManagerBase.prototype.startObserve = function() {
  var callbacks = this._callbacks = [];

  this.KEYS.forEach(function(key, i) {
    var callback = function(e) {
      this[this.PROPERTIES[i]] = e.settingValue;
      if (typeof this.onsettingchange === 'function') {
        this.onsettingchange();
      }
    }.bind(this);

    navigator.mozSettings.addObserver(key, callback);
    callbacks.push(callback);
  }, this);
};

SettingsManagerBase.prototype.stopObserve = function() {
  if (!this._callbacks) {
    return;
  }

  var callbacks = this._callbacks;
  this.KEYS.forEach(function(key, i) {
    navigator.mozSettings.removeObserver(key, callbacks[i]);
  }, this);

  this._callbacks = null;
};

var SoundFeedbackSettings = function() {};
SoundFeedbackSettings.prototype = new SettingsManagerBase();
SoundFeedbackSettings.prototype.KEYS = [
  'keyboard.clicksound', 'audio.volume.notification'];
SoundFeedbackSettings.prototype.PROPERTIES = [
  'clickEnabled', 'isSoundEnabled'];

var VibrationFeedbackSettings = function() {};
VibrationFeedbackSettings.prototype = new SettingsManagerBase();
VibrationFeedbackSettings.prototype.KEYS = ['keyboard.vibration'];
VibrationFeedbackSettings.prototype.PROPERTIES = ['vibrationEnabled'];

var IMEngineSettings = function() { };
IMEngineSettings.prototype = new SettingsManagerBase();
IMEngineSettings.prototype.KEYS = [
  'keyboard.wordsuggestion', 'keyboard.autocorrect'];
IMEngineSettings.prototype.PROPERTIES = [
  'suggestionsEnabled', 'correctionsEnabled'];

exports.SettingsPromiseManager = SettingsPromiseManager;
exports.SettingsManagerBase = SettingsManagerBase;
exports.SoundFeedbackSettings = SoundFeedbackSettings;
exports.VibrationFeedbackSettings = VibrationFeedbackSettings;
exports.IMEngineSettings = IMEngineSettings;

})(window);
