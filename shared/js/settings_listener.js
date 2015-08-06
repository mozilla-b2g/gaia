/* exported SettingsListener */
'use strict';

var SettingsListener = {
  /* Timer to remove the lock. */
  _timer: null,

  /* lock stores here */
  _lock: null,

  /* keep record of observers in order to remove them in the future */
  _observers: [],

  /**
   * getSettingsLock: create a lock or retrieve one that we saved.
   * mozSettings.createLock() is expensive and lock should be reused
   * whenever possible.
   */
  getSettingsLock: function sl_getSettingsLock() {
    // If there is a lock present we return that
    if (this._lock && !this._lock.closed) {
      return this._lock;
    }

    // If there isn't we return one.
    var settings = window.navigator.mozSettings;

    return (this._lock = settings.createLock());
  },

  observe: function sl_observe(name, defaultValue, callback) {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      window.setTimeout(function() { callback(defaultValue); });
      return;
    }

    var systemSettingsCache = window.SystemSettingsCache;
    if (systemSettingsCache) {
      // XXX: Bug 1117445, reduce system app launch time.
      // If SystemSettingsCache is available, use this shortcut to speed up.
      // SystemSettingsCache call settings.createLock().get('*') and will have
      // all settings value, ideally we can always hit cache and save some time.
      // Note that we don't add any settings observer when cache is available,
      // observer will be added in SystemSettingsCache and we can early return.
      systemSettingsCache.get(name, callback);
      return;
    }

    var req;
    try {
      req = this.getSettingsLock().get(name);
    } catch (e) {
      // It is possible (but rare) for getSettingsLock() to return
      // a SettingsLock object that is no longer valid.
      // Until https://bugzilla.mozilla.org/show_bug.cgi?id=793239
      // is fixed, we just catch the resulting exception and try
      // again with a fresh lock
      console.warn('Stale lock in settings_listener.js.',
                   'See https://bugzilla.mozilla.org/show_bug.cgi?id=793239');
      this._lock = null;
      req = this.getSettingsLock().get(name);
    }

    req.addEventListener('success', (function onsuccess() {
      callback(typeof(req.result[name]) != 'undefined' ?
        req.result[name] : defaultValue);
    }));

    var settingChanged = function settingChanged(evt) {
      callback(evt.settingValue);
    };
    settings.addObserver(name, settingChanged);
    this._observers.push({
      name: name,
      callback: callback,
      observer: settingChanged
    });
  },

  unobserve: function sl_unobserve(name, callback) {
    var settings = window.navigator.mozSettings;
    var that = this;
    this._observers.forEach(function(value, index) {
      if (value.name === name && value.callback === callback) {
        settings.removeObserver(name, value.observer);
        that._observers.splice(index, 1);
      }
    });
  }
};
