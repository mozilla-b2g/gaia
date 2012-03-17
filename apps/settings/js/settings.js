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

// ensure the root page is visible at startup
window.addEventListener('DOMContentLoaded', function showRoot() {
  document.location.hash = '#root';
  document.querySelector('#root').classList.remove('active');

  // update UI when the language setting is changed
  // XXX there's no way currently to fire a callback when a pref is changed
  //     so we're using an ugly onclick + timeout :-/
  var languages = document.getElementById('languages');
  languages.addEventListener('click', function onclick() {
    setTimeout(function getLanguageSetting() {
      var req = navigator.mozSettings.get('language.current');
      req.onsuccess = function retranslate() {
        document.mozL10n.language = req.result.value;
      }
    }, 0);
  });
});

// back button = close dialog || back to the root page
window.addEventListener('keyup', function goBack(event) {
  if (document.location.hash != '#root' &&
      event.keyCode === event.DOM_VK_ESCAPE) {
    event.preventDefault();
    event.stopPropagation();

    var dialog = document.querySelector('#dialogs .active');
    if (dialog) {
      dialog.classList.remove('active');
      document.body.classList.remove('dialog');
    }
    else {
      document.location.hash = '#root';
    }
  }
});

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  var html = document.querySelector('html');
  html.setAttribute('lang', document.mozL10n.language);
  html.setAttribute('dir', document.mozL10n.direction);
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
