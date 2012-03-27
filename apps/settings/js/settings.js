/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Settings = {
  init: function settings_init() {
    this.loadGaiaCommit();

    var settings = window.navigator.mozSettings;
    var transaction = settings.getLock();

    var checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
      (function(checkbox) {
        var key = checkbox.name;
        if (!key)
          return;

        var request = transaction.get(key);
        request.onsuccess = function() {
          checkbox.checked = request.result[key] === 'true' ? true : false;
        };
      })(checkboxes[i]);
    }

    var radios = document.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < radios.length; i++) {
      (function(radio) {
        var key = radio.name;
        if (!key)
          return;

        var request = transaction.get(key);
        request.onsuccess = function() {
          radio.checked = (request.result[key] === radio.value);
        };
      })(radios[i]);
    }

    var progresses = document.querySelectorAll('progress');
    for (var i = 0; i < progresses.length; i++) {
      (function(progress) {
        var key = progress.dataset.name;
        if (!key)
          return;

        var request = transaction.get(key);
        request.onsuccess = function() {
          progress.value = parseFloat(request.result[key]) * 10;
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

        window.navigator.mozSettings.getLock().set(key, value);
        break;

      case 'click':
        if (input.tagName.toLowerCase() != 'progress')
          return;

        var rect = input.getBoundingClientRect();
        var position = Math.ceil((evt.clientX - rect.left) / (rect.width / 10));

        var value = position / input.max;
        screen.mozBrightness = value;
        input.value = position;

        window.navigator.mozSettings.getLock().set(key, value);
        break;
    }
  },
  loadGaiaCommit: function() {
    var req = new XMLHttpRequest();
    req.onreadystatechange = (function(e) {
      if (req.readyState === 4) {
        if (req.status === 200) {
          var hash = req.responseText;
          var disp = document.getElementById('gaia-commit');
          // XXX it would be great to pop a link to the github page
          // showing the commit but there doesn't seem to be any way
          // to tell the browser to do it.
          disp.textContent = 'Git commit '+ hash;
        } else {
          console.error("Failed to fetch gaia commit: ", oXHR.statusText);
        }  
      }
    }).bind(this);
    req.open("GET", 'gaia-commit.txt', true/*async*/);
    req.responseType = 'text';
    req.send();
  }
};

// apply user changes to 'Settings'
window.addEventListener('load', function loadSettings(evt) {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Settings);
  window.addEventListener('click', Settings);
  Settings.init();
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
      document.location.hash = 'root';
    }
  }
});

// set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showPanel() {
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.lang = lang.code;
  html.dir = lang.direction;

  // <body> children are hidden until the UI is translated
  if (document.body.classList.contains('hidden')) {
    // first run: show main page
    document.location.hash = 'root';
    document.body.classList.remove('hidden');
  }
  else {
    // we were in #languages and selected another locale:
    // reset the hash to prevent weird focus bugs when switching LTR/RTL
    setTimeout(function() {
      document.location.hash = 'languages';
    }, 0);
  }
});
