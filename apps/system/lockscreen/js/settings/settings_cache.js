 'use strict';

/**
 * A settings getter/setter cache.
 * Provide as few as possible APIs like the native APIs do.
 **/
(function(exports) {
  var SettingsCache = function() {
    this.cache = {};
    this.handleSettings = this.handleSettings.bind(this);
  };
  SettingsCache.prototype.get = function(entry) {
    if (this.cache[entry]) {
      return Promise.resolve(this.cache[entry]);
    }

    var resolve, reject;
    var promise = new Promise((rev, rej) => {
      resolve = rev;
      reject = rej;
    });
    var lock = navigator.mozSettings.createLock();
    var req = lock.get(entry);
    req.onsuccess(() => {
      this.cache[entry] = req.result;
      // Once it getted, monitor it to update cache.
      navigator.mozSettings
        .addObserver(entry, this.handleSettings);
      resolve(req.result);
    });
    req.onerror(() => {
      reject(req.error);
    });
    return promise;
  };
  SettingsCache.prototype.set = function(entry, value) {
    var resolve, reject;
    var promise = new Promise((rev, rej) => {
      resolve = rev;
      reject = rej;
    });
    var lock = navigator.mozSettings.createLock();
    var reqcontent = {};
    reqcontent[entry] = value;
    var req = lock.set(reqcontent);
    req.onsuccess(() => {
      this.cache[entry] = value;
      resolve();
    });
    req.onerror(() => {
      reject();
    });
    return promise;
  };
  SettingsCache.prototype.handleSettings = function(evt) {
    var { settingsName, settingsValue } = evt;
    this.cache[settingsName] = settingsValue;
  };
  SettingsCache.prototype.stop = function() {
    Object.keys(this.cache).forEach((entry) => {
      navigator.mozSettings.removeObserver(entry, this.handleSettings);
    });
  };
  exports.SettingsCache = SettingsCache;
})(window);

