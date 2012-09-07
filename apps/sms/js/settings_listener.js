/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SettingsListener = {
  /* Timer to remove the lock. */
  _timer: null,

  /* lock stores here */
  _lock: null,

  /* getSettingsLock: create a lock or retrieve one that we saved.
  *  mozSettings.createLock() is expensive and lock should be reused
  *  whenever possible.
  */
  getSettingsLock: function sl_getSettingsLock() {
    // Each time there is a getSettingsLock call, we pospone the removal
    clearTimeout(this._timer);
    this._timer = setTimeout((function removeLock() {
      this._lock = null;
    }).bind(this), 0);

    // If there is a lock present we return that
    if (this._lock) {
      return this._lock;
    }

    // If there isn't we return one.
    var settings = window.navigator.mozSettings;

    // Once
    // https://bugzilla.mozilla.org/show_bug.cgi?id=788561
    // lands, we should get rid of `getLock()` call below.
    if (settings.createLock) {
      this._lock = settings.createLock();
    } else {
      this._lock = settings.getLock();
    }
    return this._lock;
  },
  observe: function sl_observe(name, defaultValue, callback) {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      window.setTimeout(function() { callback(defaultValue); });
      return;
    }

    var req = this.getSettingsLock().get(name);
    req.addEventListener('success', (function onsuccess() {
      callback(typeof(req.result[name]) != 'undefined' ?
        req.result[name] : defaultValue);
    }));

    settings.addObserver(name, function settingChanged(evt) {
      callback(evt.settingValue);
    });
  }
};
