/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Duplicated code in severla places
// TODO Better settings observe interface?

var SettingsListener = {
  _callbacks: {},

  init: function sl_init() {
    if ('mozSettings' in navigator && navigator.mozSettings)
      navigator.mozSettings.onsettingchange = this.onchange.bind(this);
  },

  onchange: function sl_onchange(evt) {
    var callback = this._callbacks[evt.settingName];
    if (callback) {
      callback(evt.settingValue);
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

    this._callbacks[name] = callback;
  }
};

SettingsListener.init();

const IMEManager = {
  // keyboard layouts selected by the user from settings
  keyboards: [],
  // keyboard setting groups selected by the user from settings
  settingGroups: [],

  // layouts to turn on correspond to keyboard.layouts.* setting
  // TODO: gaia issue 347, better setting UI and setting data store
  keyboardSettingGroups: {
    'english': ['en'],
    'dvorak': ['en-Dvorak'],
    'otherlatins': ['fr', 'de', 'nb', 'sk', 'tr'],
    'cyrillic': ['ru', 'sr-Cyrl'],
    'hebrew': ['he'],
    'zhuyin': ['zh-Hant-Zhuyin'],
    'pinyin': ['zh-Hans-Pinyin'],
    'arabic': ['ar'],
    'greek': ['el']
  },

  enableSetting: function km_enableSetting(theKey) {
    if (this.settingGroups.indexOf(theKey) === -1)
      this.settingGroups.push(theKey);

    this.updateSettings();
  },

  disableSetting: function km_disableSetting(theKey) {
    var i = this.settingGroups.indexOf(theKey);
    if (i === -1) {
      this.updateSettings();
      return;
    }

    this.settingGroups = [].concat(
      this.settingGroups.slice(0, i),
      this.settingGroups.slice(i + 1, this.settingGroups.length));

    this.updateSettings();
  },

  updateSettings: function km_updateSettings() {
    this.keyboards = [];
    for (var key in this.keyboardSettingGroups) {
      if (this.settingGroups.indexOf(key) === -1)
        continue;
      this.keyboards = this.keyboards.concat(this.keyboardSettingGroups[key]);
    }

    if (!this.keyboards.length) {
      console.warn('[keyboard] no keyboard layouts present');
      this.keyboards = [].concat(this.keyboardSettingGroups['english']);
    }

    if (this.keyboards.indexOf(IMEController.currentKeyboard) === -1)
        IMEController.currentKeyboard = this.keyboards[0];

    this.keyboards.forEach((function loadIMEngines(name) {
      IMEController.loadKeyboard(name);
    }).bind(this));
  },

  _events: ['unload', 'resize'],

// TODO: Replce the former when https://bugzilla.mozilla.org/show_bug.cgi?id=754083 is solved
//  _events: ['showime', 'hideime', 'unload', 'resize'],
  init: function km_init() {
    // Setup other modules
    IMEController.init();
    IMEFeedback.init();

    // Setup the manager
    this.updateSettings();
    this._events.forEach((function attachEvents(type) {
      window.addEventListener(type, this);
    }).bind(this));

    var self = this;
    for (var key in this.keyboardSettingGroups) {
      (function observeSettings(key) {
        SettingsListener.observe('keyboard.layouts.' + key, false,
          function(value) {
            if (value)
              self.enableSetting(key);
            else
              self.disableSetting(key);
          }
        );
      })(key);
    }

    // Handling showime and hideime events, as they are received only in System
    // https://bugzilla.mozilla.org/show_bug.cgi?id=754083
    console.log('attaching');
    window.addEventListener('message', function receiver(e) {
      var event = JSON.parse(e.data);
      IMEManager.handleEvent(event);
    });

  },

  uninit: function km_uninit() {
    // Shutdown the manager
    this._events.forEach((function attachEvents(type) {
      window.removeEventListener(type, this);
    }).bind(this));

    // Shutdown other modules
    IMEFeedback.uninit();
    IMEController.uninit();
  },

  // TODO: Build a closure and convert these to private variables
  _hideIMETimer: 0,
  _formerWidth: window.innerWidth,
  _formerHeight: window.innerHeight,

  handleEvent: function km_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'showime':
        // cancel hideIME that imminently happen before showIME
        clearTimeout(this._hideIMETimer);
        this.showIME(evt.detail.type);

        break;

      case 'hideime':
        this._hideIMETimer = window.setTimeout((function execHideIME() {
          this.hideIME();
        }).bind(this), 0);

        break;

      case 'resize':
        var currentWidth = window.innerWidth;
        var currentHeight = window.innerHeight;
        var formerWidth = this._formerWidth;
        var formerHeight = this._formerHeight;

        IMEController.onResize(
          currentWidth, currentHeight,
          formerWidth, formerHeight
        );

        this._formerWidth = currentWidth;
        this._formerHeight = currentHeight;

        break;

      case 'unload':
        this.uninit();
        break;
    }
  },

  showIME: function km_showIME(type) {
    IMEController.showIME(type);
  },

  hideIME: function km_hideIME(imminent) {
    IMEController.hideIME(imminent);
  }

};

window.addEventListener('load', function initIMEManager(evt) {
  window.removeEventListener('load', initIMEManager);
  IMEManager.init();
});
