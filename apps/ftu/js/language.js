/* global KeyboardHelper, LanguageList */
/* exported LanguageManager */
'use strict';

var LanguageManager = {
  settings: window.navigator.mozSettings,

  init: function init() {
    this.buildLanguageList();
    document.getElementById('languages').addEventListener('change', this);
    window.addEventListener('localized',
      this.localizedEventListener.bind(this));

    var onSettingChange = this._boundHandleSettingChange =
      this.handleSettingChange.bind(this);
    this.settings.addObserver('language.current', onSettingChange);
    this.settings.addObserver('accessibility.screenreader', onSettingChange);
  },

  uninit: function uninit() {
    if (this._boundHandleSettingChange) {
      this.settings.removeObserver('language.current',
        this._boundHandleSettingChange);
      this.settings.removeObserver('accessibility.screenreader',
        this._boundHandleSettingChange);
    }
  },

  handleSettingChange: function(evt) {
    switch (evt.settingName) {
      case 'accessibility.screenreader':
        this.buildLanguageList();
        break;
      case 'language.current':
        // the 2nd parameter is to reset the current enabled layouts
        KeyboardHelper.changeDefaultLayouts(evt.settingValue, true);
        break;
    }
  },

  handleEvent: function handleEvent(evt) {
    if (!this.settings || evt.target.name != 'language.current') {
      return true;
    }
    this.setLanguage(evt.target.value);
    return false;
  },

  // update current launguage settings
  setLanguage: function settings_setLanguage(language) {
    this.settings.createLock().set({
      'language.current': language
    });
  },

  // set proper timeformat while localized
  localizedEventListener: function settings_localizedEventListener() {
    navigator.mozL10n.formatValue('shortTimeFormat').then((format) => {
      var is12hFormat = (format.indexOf('%I') >= 0);
      this.settings.createLock().set({
        'locale.hour12': is12hFormat
      });
    });
  },

  buildLanguageList: function settings_buildLanguageList() {
    var container = document.querySelector('#languages ul');
    container.innerHTML = '';
    LanguageList.get(function fillLanguageList(allLanguages, currentLanguage) {
      for (var lang in allLanguages) {
        var label = document.createElement('label');
        // wrap the name of the language in Unicode control codes which force
        // the proper direction of the text regardless of the direction of
        // the whole app
        label.textContent = LanguageList.wrapBidi(lang, allLanguages[lang]);

        var radio = document.createElement('gaia-radio');
        radio.className = 'checkone';
        radio.setAttribute('name', 'language.current');
        radio.setAttribute('value', lang);
        radio.checked = (lang === currentLanguage);
        radio.appendChild(label);

        // Needed to use a custom class with dynamic insertion.
        radio.configureClass();

        var li = document.createElement('li');
        li.dataset.value = lang;
        li.appendChild(radio);
        container.appendChild(li);
      }
      window.dispatchEvent(new CustomEvent('languagelistready'));
    });
  }
};
