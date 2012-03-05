/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Settings = {
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

    var progresses = document.querySelectorAll('progress');
    for (var i = 0; i < progresses.length; i++) {
      (function(progress) {
        var key = progress.dataset.name;
        if (!key)
          return;

        var request = settings.get(key);
        request.onsuccess = function() {
          var result = request.result;
          progress.value = parseFloat(result.value) * 10;
        };
      })(progresses[i]);
    }

    window.parent.postMessage('appready', '*');
  },
  handleEvent: function(evt) {
    var input = evt.target;
    var key = input.name || input.dataset.name;
    if (!key)
      return;
        
        
    switch(evt.type) {
      case 'change':
        var value;
        if (input.type === 'checkbox') {
          value = input.checked;
        } else if (input.type == 'radio') {
          value = input.value;
        }

        window.navigator.mozSettings.set(key, value);
        window.parent.postMessage(key, '*');
        break;

      case 'click':
        if (input.tagName.toLowerCase() != 'progress')
          return;

        var rect = input.getBoundingClientRect();
        var position = Math.ceil((evt.clientX - rect.left) / (rect.width / 10));

        var value = position / input.max;
        screen.mozBrightness = value;
        input.value = position;

        window.navigator.mozSettings.set(key, value);
        window.parent.postMessage(key, '*');
        break;
    }
  }
};

window.addEventListener('load', function loadSettings(evt) {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Settings);
  window.addEventListener('click', Settings);
  Settings.init();
});
