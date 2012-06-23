/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SettingsListener = {
  _callbacks: {},

  init: function sl_init() {
    if ('mozSettings' in navigator && navigator.mozSettings)
      navigator.mozSettings.onsettingchange = this.onchange.bind(this);
  },

  onchange: function sl_onchange(evt) {
    var callbacks = this._callbacks[evt.settingName];
    if (callbacks) {
      callbacks.forEach(function sl_each(callback) {
        callback(evt.settingValue);
      });
    }
  },

  observe: function sl_observe(name, defaultValue, callback) {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      window.setTimeout(function() { callback(defaultValue); });
      return;
    }

    var req = settings.getLock().get(name);
    req.addEventListener('success', (function onsuccess() {
      callback(typeof(req.result[name]) != 'undefined' ?
        req.result[name] : defaultValue);
    }));

    if (!this._callbacks[name])
      this._callbacks[name] = [];

    this._callbacks[name].push(callback);
  }
};

SettingsListener.init();

function setWallpaper(value) {
  var url = 'url(resources/images/backgrounds/' + value + ')';

  var lockscreen = document.getElementById('lockscreen');
  lockscreen.style.backgroundImage = url;

  document.body.style.backgroundImage = url;
}

SettingsListener.observe('homescreen.wallpaper', 'default.png', setWallpaper);

