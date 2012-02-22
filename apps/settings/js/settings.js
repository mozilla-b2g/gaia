/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

Gaia.SettingsApp = {
  init: function settings_init() {
    var checkboxes = document.querySelectorAll('input[type="checkbox"]');

    var settings = window.navigator.mozSettings;
    for (var i = 0; i < checkboxes.length; i++) {
      (function(checkbox) {
        var key = checkbox.name;
        
        if (!key)
          return;

        var request = settings.get(key);
        request.onsuccess = function() {
          var result = request.result;
          checkbox.checked = result.value === 'true' ? true : false;
        };
      })(checkboxes[i]);
    }
    window.parent.postMessage('appready', '*');
  },
  handleEvent: function(evt) {
    switch(evt.type) {
    case 'change':
      var input = evt.target;
      if (!input)
        return;
        
      var key = input.name;
      if (!key)
        return;
        
      var value;
      if (input.type === 'checkbox')
        value = input.checked;

      window.navigator.mozSettings.set(key, value);
      break;
    }
  }
};

window.addEventListener('load', function loadSettings(evt) {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Gaia.SettingsApp);
  Gaia.SettingsApp.init();
});
