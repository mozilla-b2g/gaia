/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* Debugging code for the environment without mozKeyboard,
 * such as Firefox Nightly build */
if (!window.navigator.mozKeyboard) {
  window.navigator.mozKeyboard = {
    sendKey: function emulateSendKey(charCode, keyCode) {
      console.log('moz sendKey: (' + charCode + ', ' + keyCode + ')');
    }
  };
} else {
  var focusChangeTimeout = 0;
  var focusChangeDelay = 20;
  window.navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {

    var typeToSkip = ['select-one', 'select-multiple', 'date',
                        'time', 'datetime', 'datetime-local'];
    var type = evt.detail.type;
    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (typeToSkip.indexOf(type) != -1)
      return;

    clearTimeout(focusChangeTimeout);
    focusChangeTimeout = setTimeout(function switchKeyboard() {
      if (type === 'blur') {
        IMEController.hideIME();
      } else {
        IMEController.showIME(type);
      }
    }, focusChangeDelay);
  };
}

// in charge of initiate the controller and be aware about settings changes
const IMEManager = {

  // keyboard layouts selected by the user from settings
  keyboards: [],
  // keyboard setting groups selected by the user from settings
  settingGroups: [],

  // Default layout group.
  // XXX: This should be in settings, see:
  // https://github.com/mozilla-b2g/gaia/issues/2346
  defaultGroup: 'english',

  // layouts to turn on correspond to keyboard.layouts.* setting
  // TODO: gaia issue 347, better setting UI and setting data store
  // XXX: See https://github.com/mozilla-b2g/gaia/issues/2346 for more info
  keyboardSettingGroups: {
    'english': ['en'],
    'dvorak': ['en-Dvorak'],
    'spanish' : ['es'],
    'portuguese' : ['pt_BR'],
    'otherlatins': ['fr', 'de', 'nb', 'sk', 'tr', 'es', 'pt_BR'],
    'cyrillic': ['ru', 'sr-Cyrl'],
    'hebrew': ['he'],
    'zhuyin': ['zh-Hant-Zhuyin'],
    'pinyin': ['zh-Hans-Pinyin'],
    'arabic': ['ar'],
    'greek': ['el'],
    'japanese': ['jp-kanji']
  },

  enableSetting: function km_enableSetting(theKey) {
    // Remove the fallback
    // XXX: This is here to workaround the lack of defined behaviour related
    // with fallback options for the keyboard layout.
    // https://github.com/mozilla-b2g/gaia/issues/2346
    if (this.fallback) {
      this.settingGroups.splice(
        this.settingGroups.indexOf(this.defaultGroup), 1);
      delete this.fallback;
    }

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

    this.settingGroups.splice(i, 1);
    this.updateSettings();
  },

  updateSettings: function km_updateSettings() {
    this.keyboards = [];

    // Default
    if (!this.settingGroups.length) {
      this.settingGroups.push(this.defaultGroup);
      this.fallback = true;
    }

    for (var key in this.keyboardSettingGroups) {
      if (this.settingGroups.indexOf(key) === -1)
        continue;
      this.keyboards = this.keyboards.concat(this.keyboardSettingGroups[key]);
    }

    if (this.keyboards.indexOf(IMEController.currentKeyboard) === -1)
      IMEController.currentKeyboard = this.keyboards[0];

    this.keyboards.forEach((function loadIMEngines(name) {
      IMEController.loadKeyboard(name);
    }).bind(this));
  },

  _events: ['unload', 'resize'],

  init: function km_init() {
    IMEController.init();
    IMEFeedback.init();

    this.updateSettings();
    this._events.forEach((function attachEvents(type) {
      window.addEventListener(type, this);
    }).bind(this));

    var self = this;
    SettingsListener.observe('keyboard.wordsuggestion', false, function(value) {
      var wordSuggestionEnabled = !!value;
      IMEController.enableWordSuggestion(wordSuggestionEnabled);
    });

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
  _formerWidth: window.innerWidth,
  _formerHeight: window.innerHeight,

  handleEvent: function km_handleEvent(evt) {
    var target = evt.target;
    switch (evt.type) {
      case 'resize':
        var currentWidth = window.innerWidth;
        var currentHeight = window.innerHeight;
        var formerWidth = this._formerWidth;
        var formerHeight = this._formerHeight;

        IMEController.onResize(currentWidth, currentHeight,
                               formerWidth, formerHeight);

        this._formerWidth = currentWidth;
        this._formerHeight = currentHeight;
        break;

      case 'unload':
        this.uninit();
        break;
    }
  }
};

// Utility functions
function getWindowTop(obj) {
  var top;
  top = obj.offsetTop;
  while (!!(obj = obj.offsetParent)) {
    top += obj.offsetTop;
  }
  return top;
}

function getWindowLeft(obj) {
  var left;
  left = obj.offsetLeft;
  while (!!(obj = obj.offsetParent)) {
    left += obj.offsetLeft;
  }
  return left;
}

var SettingsListener = {
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

    settings.addObserver(name, function settingChanged(evt) {
      callback(evt.settingValue);
    });
  }
};

window.addEventListener('load', function initIMEManager(evt) {
  window.removeEventListener('load', initIMEManager);
  IMEManager.init();
});

