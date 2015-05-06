 'use strict';

/**
 * A settings getter/setter cache.
 * Provide as few as possible APIs like the native APIs do.
 **/
(function(exports) {
  var LockScreenSettingsCache = function() {
    this.cache = {};
    this.handleSettings = this.handleSettings.bind(this);
  };
  LockScreenSettingsCache.prototype.get = function(entry) {
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
    req.then(() => {
      this.cache[entry] = req.result;
      // Once it getted, monitor it to update cache.
      navigator.mozSettings
        .addObserver(entry, this.handleSettings);
      resolve(req.result);
    }).catch(() => {
      reject(req.error);
    });
    return promise;
  };
  LockScreenSettingsCache.prototype.set = function(entry, value) {
    var resolve, reject;
    var promise = new Promise((rev, rej) => {
      resolve = rev;
      reject = rej;
    });
    var lock = navigator.mozSettings.createLock();
    var reqcontent = {};
    reqcontent[entry] = value;
    var req = lock.set(reqcontent);
    req.then(() => {
      this.cache[entry] = value;
      resolve();
    }).catch(() => {
      reject();
    });
    return promise;
  };
  LockScreenSettingsCache.prototype.handleSettings = function(evt) {
    var { settingsName, settingsValue } = evt;
    this.cache[settingsName] = settingsValue;
  };
  LockScreenSettingsCache.prototype.stop = function() {
    Object.keys(this.cache).forEach((entry) => {
      navigator.mozSettings.removeObserver(entry, this.handleSettings);
    });
  };
  exports.LockScreenSettingsCache = LockScreenSettingsCache;
})(window);

