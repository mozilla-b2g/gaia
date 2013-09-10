'use strict';

var LanguageManager = {
  settings: window.navigator.mozSettings,

  init: function init() {
    this.getCurrentLanguage(this.buildLanguageList.bind(this));
    this.getCurrentKeyboardLayout();
    this.getSupportedKbLayouts();
    document.getElementById('languages').addEventListener('change', this);
    this.settings.addObserver('language.current',
        this.changeDefaultKb.bind(this));
  },

  handleEvent: function handleEvent(evt) {
    if (!this.settings || evt.target.name != 'language.current')
      return true;
    this.settings.createLock().set({'language.current': evt.target.value});
    return false;
  },

  changeDefaultKb: function changeDefaultKb(event) {
    if (this._kbLayoutList) {
      var lock = this.settings.createLock();
      var kbSettings = KeyboardHelper.keyboardSettings;
      var protocol =
          (window.location.protocol === 'http:') ? 'http://' : 'app://';
      var kbOrigin = protocol + 'keyboard.gaiamobile.org';

      // Disable all other keyboard layouts to switch to the new one
      for (var i = kbSettings.length - 1; i >= 0; i--) {
        var kb = kbSettings[i];
        if (kb.layoutId !== 'number' && kb.enabled)
          KeyboardHelper.setLayoutEnabled(kbOrigin, kb.layoutId, false);
      }

      var newKbLayouts = this._kbLayoutList.layout[event.settingValue];
      for (var i = newKbLayouts.length - 1; i >= 0; i--)
        KeyboardHelper.setLayoutEnabled(kbOrigin, newKbLayouts[i], true);

      lock.set({'keyboard.current': event.settingValue});

      this._currentLanguage = event.settingValue;
      // If the currently selected language has a non-latin keyboard,
      // activate the English keyboard as well
      if (this._kbLayoutList.nonLatin.indexOf(event.settingValue) !== -1)
        KeyboardHelper.setLayoutEnabled(kbOrigin, 'en', true);

    }
  },

  getCurrentLanguage: function settings_getCurrent(callback) {
    var self = this;
    this.readSetting('language.current', function onResponse(setting) {
      self._currentLanguage = setting;
      callback(setting);
    });
  },

  getCurrentKeyboardLayout: function settings_getCurrentKb() {
    var self = this;
    this.readSetting('keyboard.current', function onResponse(setting) {
      if (setting) {
        self._currentKbLayout = setting;
      }
    });
  },

  readSetting: function settings_readSetting(name, callback) {
    var settings = window.navigator.mozSettings;
    if (!settings || !settings.createLock || !callback)
      return;

    var req = settings.createLock().get(name);

    req.onsuccess = function _onsuccess() {
      callback(req.result[name]);
    };

    req.onerror = function _onerror() {
      console.error('Error checking setting ' + name);
    };
  },

  getSupportedLanguages: function settings_getSupportedLanguages(callback) {
    if (!callback)
      return;

    if (this._languages) {
      callback(this._languages);
    } else {
      var LANGUAGES = 'languages.json';
      var self = this;
      this.readSharedFile(LANGUAGES, function getLanguages(data) {
        if (data) {
          self._languages = data;
          callback(self._languages);
        }
      });
    }
  },

  getSupportedKbLayouts: function settings_getSupportedKbLayouts(callback) {
    if (this._kbLayoutList) {
      if (callback)
        callback(this._kbLayoutList);
    } else {
      var KEYBOARDS = 'keyboard_layouts.json';
      var self = this;
      this.readSharedFile(KEYBOARDS, function getKeyboardLayouts(data) {
        if (data) {
          self._kbLayoutList = data;
          if (callback)
            callback(self._kbLayoutList);
        }
      });
    }
  },

  readSharedFile: function settings_readSharedFile(file, callback) {
    var URI = '/shared/resources/' + file;
    if (!callback)
      return;

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function loadFile() {
      if (xhr.readyState === 4) {
        if (xhr.status === 0 || xhr.status === 200) {
          callback(xhr.response);
        } else {
          console.error('Failed to fetch file: ' + file, xhr.statusText);
        }
      }
    };
    xhr.open('GET', URI, true); // async
    xhr.responseType = 'json';
    xhr.send();
  },

  buildLanguageList: function settings_buildLanguageList(uiLanguage) {
    var container = document.querySelector('#languages ul');
    container.innerHTML = '';
    this.getSupportedLanguages(function fillLanguageList(languages) {
      for (var lang in languages) {
        var input = document.createElement('input');
        input.type = 'radio';
        input.name = 'language.current';
        input.value = lang;
        input.checked = (lang == uiLanguage);

        var span = document.createElement('span');
        var p = document.createElement('p');

        // Right-to-Left (RTL) languages:
        // (http://www.w3.org/International/questions/qa-scripts)
        // Arabic, Hebrew, Farsi, Pashto, Urdu
        var rtlList = ['ar', 'he', 'fa', 'ps', 'ur'];
        var langDir = (rtlList.indexOf(lang) >= 0) ? 'rtl' : 'ltr';
        // Each language label should be wrapped in Bi-Directional Override
        // <bdo> tags with language-specific script direction to correctly
        // display the labels (Bug #847739)
        var bdo = document.createElement('bdo');
        bdo.setAttribute('dir', langDir);
        bdo.textContent = languages[lang];
        p.appendChild(bdo);

        var label = document.createElement('label');
        label.classList.add('pack-radio');
        label.appendChild(input);
        label.appendChild(span);
        label.appendChild(p);

        var li = document.createElement('li');
        li.appendChild(label);
        container.appendChild(li);
      }
    });
  }
};

LanguageManager.init();

