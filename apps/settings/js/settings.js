/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var Settings = {
  init: function settings_init() {
    // XXX we could be smarter here and automatically parse the dom to
    // discover settings
    var request = window.navigator.mozSettings.get('lockscreen');
    request.onsuccess = function() {
      var checked = request.result.value == 'enabled' ? 0 : 1;
      document.getElementById('lockscreen-checkbox').checked = checked;
    }
  },
  toggle: function settings_toggle(key) {
    var request = window.navigator.mozSettings.get(key);
    request.onsuccess = function() {
      var value = request.result.value;
      var toggleValue = value == 'enabled' ? 'disabled' : 'enabled';
      window.navigator.mozSettings.set('lockscreen', toggleValue);
    }
  }
};

window.addEventListener('load', function loadSettings(evt) {
  window.removeEventListener('load', loadSettings);
  Settings.init();
});
