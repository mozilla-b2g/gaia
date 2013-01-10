'use strict';

var LanguageManager = {
  init: function init() {
    this.getCurrentLanguage(this.buildLanguageList.bind(this));
    document.getElementById('languages').addEventListener('change', this);
  },

  handleEvent: function handleEvent(evt) {
    var settings = window.navigator.mozSettings;
    if (!settings || evt.target.name != 'language.current')
      return true;

    settings.createLock().set({'language.current': evt.target.value});
    return false;
  },

  getCurrentLanguage: function settings_getCurrent(callback) {
    var settings = window.navigator.mozSettings;
    if (!settings || !settings.createLock || !callback)
      return;

    var req = settings.createLock().get('language.current');

    req.onsuccess = function _onsuccess() {
      callback(req.result['language.current']);
    };

    req.onerror = function _onerror() {
      console.error('Error checking language');
    };
  },

  getSupportedLanguages: function settings_getLanguages(callback) {
    var LANGUAGES = '/shared/resources/languages.json';
    if (!callback)
      return;

    if (this._languages) {
      callback(this._languages);
    } else {
      var self = this;
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function loadSupportedLocales() {
        if (xhr.readyState === 4) {
          if (xhr.status === 0 || xhr.status === 200) {
            self._languages = xhr.response;
            callback(self._languages);
          } else {
            console.error('Failed to fetch languages.json: ', xhr.statusText);
          }
        }
      };
      xhr.open('GET', LANGUAGES, true); // async
      xhr.responseType = 'json';
      xhr.send();
    }
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

