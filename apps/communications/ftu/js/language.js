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
      var oldKB = this._kbLayoutList[this._currentLanguage];
      var newKB = this._kbLayoutList[event.settingValue];
      var settingOldKB = {};
      var settingNewKB = {};
      settingOldKB['keyboard.layouts.' + oldKB] = false;
      settingNewKB['keyboard.layouts.' + newKB] = true;

      lock.set(settingOldKB);
      lock.set(settingNewKB);
      lock.set({'keyboard.current': event.settingValue});
      console.log('Keyboard layout changed to ' + event.settingValue);

      this._currentLanguage = event.settingValue;
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

  getSupportedKbLayouts: function settings_getSupportedKbLayouts() {
    var KEYBOARDS = 'keyboard_layouts.json';
    var self = this;
    this.readSharedFile(KEYBOARDS, function getKeyboardLayouts(data) {
      if (data) {
        self._kbLayoutList = data;
      }
    });
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
        p.textContent = languages[lang];

        var label = document.createElement('label');
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

