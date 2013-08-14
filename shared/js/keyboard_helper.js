/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Helper object to find all installed keyboard apps and layouts.
 * (Need mozApps.mgmt permission)
 */

const TYPE_GROUP = {
  'text': true,
  'url': true,
  'email': true,
  'password': true,
  'number': true,
  'option': true
};

const SETTINGS_KEY = 'keyboard.enabled-layouts';

var KeyboardHelper = {
  keyboardSettings: [],

  _debugMode: false,

  _debug: function kh_debug(string) {
    if (this._debugMode)
      console.log('[keyboard_helper]' + string);
  },

  init: function kh_init() {
    this.getKeyboardSettings();

    // update keyboardSettings
    var settings = window.navigator.mozSettings;
    settings.addObserver(SETTINGS_KEY, this.getKeyboardSettings.bind(this));
  },

  setLayoutEnabled: function kh_setLayoutEnabled(appOrigin, layoutName,
  enabled) {
    for (var i = 0; i < this.keyboardSettings.length; i++) {
      if (this.keyboardSettings[i].appOrigin === appOrigin &&
        this.keyboardSettings[i].layoutName === layoutName) {
        this.keyboardSettings[i].enabled = enabled;
        this.saveToSettings();
        break;
      }
    }
  },

  getLayoutEnabled: function kh_getLayoutEnabled(appOrigin, layoutName) {
    var enabledValue = false;
    for (var i = 0; i < this.keyboardSettings.length; i++) {
      if (this.keyboardSettings[i].appOrigin == appOrigin &&
        this.keyboardSettings[i].layoutName == layoutName) {
        enabledValue = this.keyboardSettings[i].enabled;
        break;
      }
    }
    return enabledValue;
  },

  getKeyboardSettings: function kh_getKeyboardSettings() {
    var self = this;
    var settings = window.navigator.mozSettings;
    var request = settings.createLock().get(SETTINGS_KEY);
    request.onsuccess = function(e) {
      var value = request.result[SETTINGS_KEY];
      if (!value) {
        //XXX write settings back, this shouldn't happen.
        self.getInstalledKeyboards(function(apps) {
          self.keyboardSettings = [];
          apps.forEach(function(app) {
            var entryPoints = app.manifest.entry_points;
            for (var name in entryPoints) {
              var launchPath = entryPoints[name].launch_path;
              if (!entryPoints[name].types) {
                console.warn('the keyboard app did not declare type.');
                continue;
              }
              // for settings
              self.keyboardSettings.push({
                'layoutName': name,
                'appOrigin': app.origin,
                'enabled': false
              });
            }
          });

          // XXX init settings should be get by language
          // http://bugzil.al/863719
          var defaultLayout = [];

          var protocol = window.location.protocol;
          var hackOrigin = 'app://keyboard.gaiamobile.org';
          if (protocol === 'http:') {
            hackOrigin = 'http://keyboard.gaiamobile.org:8080';
          }

          defaultLayout.push({
            'layoutName': 'English',
            'appOrigin': hackOrigin
          });

          defaultLayout.push({
            'layoutName': 'number',
            'appOrigin': hackOrigin
          });

          for (var j = 0; j < defaultLayout.length; j++) {
            var appOrigin = defaultLayout[j].appOrigin;
            var layoutName = defaultLayout[j].layoutName;
            for (var i = 0; i < self.keyboardSettings.length; i++) {
              if (self.keyboardSettings[i].appOrigin === appOrigin &&
                self.keyboardSettings[i].layoutName === layoutName) {
                self.keyboardSettings[i].enabled = true;
                break;
              }
            }
          }

          self.saveToSettings();
        });
      } else {
        self.keyboardSettings = JSON.parse(value);
      }
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('keyboardsrefresh', true, false, {});
      window.dispatchEvent(evt);
    };
  },

  saveToSettings: function ke_saveToSettings() {
    var settings = window.navigator.mozSettings;
    var obj = {};
    obj[SETTINGS_KEY] = JSON.stringify(this.keyboardSettings);
    settings.createLock().set(obj);
  },

  getInstalledKeyboards: function kh_getInstalledKeyboards(callback) {
    if (!navigator.mozApps || !navigator.mozApps.mgmt)
      return;

    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var apps = event.target.result;
      var keyboardApps = [];
      apps.forEach(function eachApp(app) {
        // keyboard apps will request keyboard API permission
        if (!(app.manifest.permissions && 'keyboard' === app.manifest.role))
          return;
        //XXX remove this hard code check if one day system app no longer
        //    use mozKeyboard API
        if (app.origin === 'app://system.gaiamobile.org')
          return;
        // all keyboard apps should define its layout(s) in entry_points section
        if (!app.manifest.entry_points)
          return;
        keyboardApps.push(app);
      });

      if (keyboardApps.length > 0 && callback)
        callback(keyboardApps);
    };
  }
};

KeyboardHelper.init();
