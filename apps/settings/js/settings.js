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

window.addEventListener('DOMContentLoaded', function showRoot() {
  // update UI when the language setting is changed
  // XXX there's no way currently to fire a callback when a pref is changed
  //     so we're using an ugly onclick + timeout :-/
  var languages = document.getElementById('languages');
  languages.addEventListener('click', function onclick() {
    setTimeout(function getLanguageSetting() {
      var req = navigator.mozSettings.get('language.current');
      req.onsuccess = function retranslate() {
        document.mozL10n.language.name = req.result.value;
      }
    }, 0);
  });
});

// When the user clicks on a link to display a new panel then change
// to the CSS :target pseudo-element will trigger a transition that makes
// that panel slide in.  We also have to hide the root panel, and there
// seems to be a gecko bug that prevents that from happening with the same
// :target pseudo-element trick.  So as a workaround we listen for hashchange
// events here to be notified when document.location.hash changes and we
// explicitly remove the 'active' class of the root panel to hide it.
// The back button event listener below adds the 'active' class back in.
window.addEventListener('hashchange', function hashChange(evt) {
  // If the hash has changed to be non-empty, then a settings panel
  // is being displayed and we need to hide the root panel
  if (document.location.hash)
    document.getElementById('root').classList.remove('active');
});

// back button = close dialog || back to the root page
window.addEventListener('keyup', function goBack(event) {
  if (document.location.hash != '' &&
      event.keyCode === event.DOM_VK_ESCAPE) {
    event.preventDefault();
    event.stopPropagation();

    var dialog = document.querySelector('#dialogs .active');
    if (dialog) {
      dialog.classList.remove('active');
      document.body.classList.remove('dialog');
    }
    else {
      document.location.hash = '';
      document.getElementById('root').classList.add('active');
    }
  }
});

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.setAttribute('lang', lang.name);
  html.setAttribute('dir', lang.direction);
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
