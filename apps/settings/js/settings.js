/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

Gaia.SettingsApp = {
  init: function settings_init() {
    var settings = window.navigator.mozSettings;

    var checkboxes = document.querySelectorAll('input[type="checkbox"]');
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

    var radios = document.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        var key = radio.name;
        if (!key)
          return;

        var request = settings.get(key);
        request.onsuccess = function() {
          var result = request.result;
          radio.checked = (result.value === radio.value);
        };
      })(radios[i]);
    }

    var brightness = document.getElementById('brightness-level');
    brightness.addEventListener('click', function clickBrightness(evt) {
      var rect = brightness.getBoundingClientRect();
      var position = Math.ceil((evt.clientX - rect.left) / (rect.width / 10));
      screen.mozBrightness = position / 10;
      brightness.value = position;
    });
    brightness.value = screen.mozBrigthness * 10;

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
      if (input.type === 'checkbox') {
        value = input.checked;
      } else if (input.type == 'radio') {
        value = input.value;
      }

      window.navigator.mozSettings.set(key, value);
      window.parent.postMessage(key, '*');
      break;
    }
  }
};

window.addEventListener('load', function loadSettings(evt) {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Gaia.SettingsApp);
  Gaia.SettingsApp.init();
});
