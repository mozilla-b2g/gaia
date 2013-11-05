/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SettingsListener = {
  /* Timer to remove the lock. */
  _timer: null,

  /* lock stores here */
  _lock: null,

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

    settings.addObserver(name, function settingChanged(evt) {
      callback(evt.settingValue);
    });
  }
};

