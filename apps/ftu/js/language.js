/* global KeyboardHelper, LanguageList, Navigation */
/* exported LanguageManager */
'use strict';

var LanguageManager = {
  settings: window.navigator.mozSettings,

  init: function init() {
    this.buildLanguageList();
    document.getElementById('languages').addEventListener('change', this);
    this.settings.addObserver('language.current',
      function updateDefaultLayouts(event) {
        // the 2nd parameter is to reset the current enabled layouts
        KeyboardHelper.changeDefaultLayouts(event.settingValue, true);
      });
    window.addEventListener('localized',
      this.localizedEventListener.bind(this));
  },

  onLanguageSelection: function onLanguageSelection(lang) {
    this.settings.createLock().set({'language.current': lang});
    //wait to translate before moving forward
    //currently buggy, moves forward too early
    navigator.mozL10n.once(Navigation.forward.bind(Navigation));
    return false;
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
    var localeTimeFormat = navigator.mozL10n.get('shortTimeFormat');
    var is12hFormat = (localeTimeFormat.indexOf('%I') >= 0);
    this.settings.createLock().set({
      'locale.hour12': is12hFormat
    });
  },

  buildLanguageList: function settings_buildLanguageList() {
    var me = this;
    var container = document.querySelector('#languages ul');
    container.innerHTML = '';
    LanguageList.get(function fillLanguageList(allLanguages, currentLanguage) {
      for (var lang in allLanguages) {

        var span = document.createElement('span');
        var p = document.createElement('p');
        // wrap the name of the language in Unicode control codes which force
        // the proper direction of the text regardless of the direction of
        // the whole app
        p.textContent = LanguageList.wrapBidi(lang, allLanguages[lang]);

        var li = document.createElement('li');
        li.setAttribute('id', lang);
        li.appendChild(span);
        li.appendChild(p);
        li.classList.add('nav-item');
        li.addEventListener('click', me.onLanguageSelection.bind(me, lang));
        container.appendChild(li);
      }
    });
  }
};

LanguageManager.init();

