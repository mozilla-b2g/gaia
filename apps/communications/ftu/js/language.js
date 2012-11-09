'use strict';

var LanguageManager = {
  init: function init() {
    document.getElementById('languages').
      addEventListener('click', this);
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
  }
};

LanguageManager.init();
