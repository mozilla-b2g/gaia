'use strict';

var LanguageManager = {
  init: function init() {
    var panel = document.getElementById('languages');
    this.buildLanguageList(panel.querySelector('ul'));
    panel.addEventListener('change', this);
  },

  handleEvent: function handleEvent(evt) {
    if (evt.target.name != 'language.current') {
      return true;
    }

    var settings = window.navigator.mozSettings;
    if (!settings.createLock) {
      return true;
    }
    var req = settings.createLock().get('language.current');

    req.onsuccess = function() {
      settings.createLock().set({'language.current': evt.target.value});
    };

    req.onerror = function() {
      console.error('Error changing language');
    };

    return false;
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

  buildLanguageList: function settings_buildLanguageList(container) {
    container.innerHTML = '';
    var uiLanguage = document.documentElement.lang || 'en-US';
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

