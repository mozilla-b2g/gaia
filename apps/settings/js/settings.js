/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Debug note: to test this app in a desktop browser, you'll have to set
 * the `dom.mozSettings.enabled' preference to false.
 */

var Settings = {
  get mozSettings() {
    // return navigator.mozSettings when properly supported, null otherwise
    // (e.g. when debugging on a browser...)
    var settings = window.navigator.mozSettings;
    return (settings && typeof(settings.createLock) == 'function') ?
        settings : null;
  },

  init: function settings_init() {
    this.loadGaiaCommit();

    var settings = this.mozSettings;
    if (!settings)
      return;

    settings.onsettingchange = function settingChanged(event) {
      var key = event.settingName;
      var value = event.settingValue;

      var checkbox =
          document.querySelector('input[type="checkbox"][name="' + key + '"]');
      if (checkbox) {
        if (checkbox.checked == value)
          return;
        checkbox.checked = value;
        return;
      }

      var progressBar =
          document.querySelector('[data-name="' + key + '"]');
      if (progressBar) {
        var intValue = Math.ceil(value * 10);
        if (progressBar.value == intValue)
          return;
        progressBar.value = intValue;
        return;
      }

      // XXX: if there are more values needs to be synced.
    };

    // preset all inputs that have a `name' attribute
    var lock = settings.createLock();

    // preset all checkboxes
    var rule = 'input[type="checkbox"]:not([data-ignore])';
    var checkboxes = document.querySelectorAll(rule);
    for (var i = 0; i < checkboxes.length; i++) {
      (function(checkbox) {
        var key = checkbox.name;
        if (!key)
          return;

        var request = lock.get(key);
        request.onsuccess = function() {
          if (request.result[key] != undefined)
            checkbox.checked = !!request.result[key];
        };
      })(checkboxes[i]);
    }

    // preset all radio buttons
    rule = 'input[type="radio"]:not([data-ignore])';
    var radios = document.querySelectorAll(rule);
    for (i = 0; i < radios.length; i++) {
      (function(radio) {
        var key = radio.name;
        if (!key)
          return;

        var request = lock.get(key);
        request.onsuccess = function() {
          if (request.result[key] != undefined)
            radio.checked = (request.result[key] === radio.value);
        };
      })(radios[i]);
    }

    // preset all text inputs
    rule = 'input[type="text"]:not([data-ignore])';
    var texts = document.querySelectorAll(rule);
    for (i = 0; i < texts.length; i++) {
      (function(text) {
        var key = text.name;
        if (!key)
          return;

        var request = lock.get(key);
        request.onsuccess = function() {
          if (request.result[key] != undefined)
            text.value = request.result[key];
        };
      })(texts[i]);
    }

    // preset all progress indicators
    var progresses = document.querySelectorAll('progress');
    for (i = 0; i < progresses.length; i++) {
      (function(progress) {
        var key = progress.dataset.name;
        if (!key)
          return;

        var request = lock.get(key);
        request.onsuccess = function() {
          if (request.result[key] != undefined)
            progress.value = parseFloat(request.result[key]) * 10;
        };
      })(progresses[i]);
    }

    // handle web activity
    navigator.mozSetMessageHandler('activity',
      function settings_handleActivity(activityRequest) {
        var name = activityRequest.source.name;
        switch (name) {
          case 'configure':
            var section = activityRequest.source.data.section || 'root';

            // Validate if the section exists
            var actualSection = document.getElementById(section);
            if (!actualSection || actualSection.tagName !== 'SECTION') {
              var msg = 'Trying to open an unexistent section: ' + section;
              console.warn(msg);
              activityRequest.postError(msg);
              return;
            }

            // Go to that section
            setTimeout(function settings_goToSection() {
              document.location.hash = section;
            });
            break;
        }
      }
    );

    // preset all select
    var selects = document.querySelectorAll('select');
    for (i = 0; i < selects.length; i++) {
      (function(select) {
        var key = select.name;
        if (!key)
          return;

        var request = lock.get(key);
        request.onsuccess = function() {
          var value = request.result[key];
          if (value != undefined) {
            select.querySelector('option[value=' + value + ']').selected = true;
          }
        };
      })(selects[i]);
    }
  },

  handleEvent: function settings_handleEvent(evt) {
    var input = evt.target;
    var key = input.name || input.dataset.name;
    var settings = this.mozSettings;
    if (!key || !settings || input.dataset.ignore)
      return;

    switch (evt.type) {
      case 'change':
        var value;
        if (input.type === 'checkbox') {
          value = input.checked;
        } else if ((input.type == 'radio') ||
                   (input.type == 'text') ||
                   (input.type == 'password') ||
                   (input.tagName.toLowerCase() == 'select')) {
          value = input.value;
        }
        var cset = {}; cset[key] = value;
        settings.createLock().set(cset);
        break;

      case 'click':
        if (input.tagName.toLowerCase() != 'progress')
          return;
        var rect = input.getBoundingClientRect();
        var position = Math.ceil(10 * (evt.clientX - rect.left) / rect.width);

        var min = parseFloat(input.getAttribute('min')) || 0;
        var max = parseFloat(input.getAttribute('max')) || 10;
        position = Math.max(min, Math.min(max, position));
        input.value = position;

        var cset = {}; cset[key] = position / 10;
        settings.createLock().set(cset);
        break;
    }
  },

  loadGaiaCommit: function settings_loadGaiaCommit() {
    var GAIA_COMMIT = 'gaia-commit.txt';

    function dateToUTC(d) {
      var arr = [];
      [
        d.getUTCFullYear(), (d.getUTCMonth() + 1), d.getUTCDate(),
        d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()
      ].forEach(function(n) {
        arr.push((n >= 10) ? n : '0' + n);
      });
      return arr.splice(0, 3).join('-') + ' ' + arr.join(':');
    }

    var req = new XMLHttpRequest();
    req.onreadystatechange = (function(e) {
      if (req.readyState === 4) {
        if (req.status === 0 || req.status === 200) {
          var data = req.responseText.split('\n');
          var dispDate = document.getElementById('gaia-commit-date');
          var disp = document.getElementById('gaia-commit-hash');
          // XXX it would be great to pop a link to the github page
          // showing the commit but there doesn't seem to be any way
          // to tell the browser to do it.
          var d = new Date(parseInt(data[1] + '000', 10));
          dispDate.textContent = dateToUTC(d);
          disp.textContent = data[0];
        } else {
          console.error('Failed to fetch gaia commit: ', req.statusText);
        }
      }
    }).bind(this);

    req.open('GET', GAIA_COMMIT, true); // async
    req.responseType = 'text';
    req.send();
  },

  openDialog: function settings_openDialog(dialogID) {
    var settings = this.mozSettings;
    var dialog = document.getElementById(dialogID);
    var fields =
        dialog.querySelectorAll('input[data-setting]:not([data-ignore])');

    /**
      * In Settings dialog boxes, we don't want the input fields to be preset
      * by Settings.init() and we don't want them to set the related settings
      * without any user validation.
      *
      * So instead of assigning a `name' attribute to these inputs, a
      * `data-setting' attribute is used and the input values are set
      * explicitely when the dialog is shown.  If the dialog is validated
      * (submit), their values are stored into B2G settings.
      *
      * XXX warning, this only supports text/password/radio input types.
      */

    // show dialog box
    function open() {
      reset(); // preset all fields
      dialog.style.display = 'block';
    }

    // hide dialog box
    function close() {
      dialog.style.display = 'none';
      return false;
    }

    // initialize all setting fields in the dialog box
    function reset() {
      if (settings) {
        var lock = settings.createLock();
        for (var i = 0; i < fields.length; i++) {
          (function(input) {
            var key = input.dataset.setting;
            var request = lock.get(key);
            request.onsuccess = function() {
              input.value = request.result[key] || '';
            };
          })(fields[i]);
        }
      }
    }

    // validate all settings in the dialog box
    function submit() {
      if (settings) {
        // mozSettings does not support multiple keys in the cset object
        // with one set() call,
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=779381
        var lock = settings.createLock();
        for (var i = 0; i < fields.length; i++) {
          var input = fields[i];
          var cset = {};
          var key = input.dataset.setting;
          cset[key] = input.value;
          lock.set(cset);
        }
      }
      return close();
    }

    dialog.onsubmit = submit;
    dialog.onreset = close;
    open();
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
// + prevent the [Return] key to validate forms
window.addEventListener('keydown', function handleSpecialKeys(event) {
  if (document.location.hash != '#root' &&
      event.keyCode === event.DOM_VK_ESCAPE) {
    event.preventDefault();
    event.stopPropagation();

    var dialog = document.querySelector('#dialogs .active');
    if (dialog) {
      dialog.classList.remove('active');
      document.body.classList.remove('dialog');
    } else {
      document.location.hash = 'root';
    }
  } else if (event.keyCode === event.DOM_VK_RETURN) {
    event.target.blur();
    event.stopPropagation();
    event.preventDefault();
  }
});

// set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showPanel() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // <body> children are hidden until the UI is translated
  if (document.body.classList.contains('hidden')) {
    // first run: show main page
    document.location.hash = 'root';
    document.body.classList.remove('hidden');
  } else {
    // we were in #languages and selected another locale:
    // reset the hash to prevent weird focus bugs when switching LTR/RTL
    window.setTimeout(function() {
      document.location.hash = 'languages';
    });
  }
});

