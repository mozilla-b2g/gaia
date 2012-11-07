/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Debug note: to test this app in a desktop browser, you'll have to set
 * the `dom.mozSettings.enabled' preference to false in order to avoid an
 * `uncaught exception: 2147500033' message (= 0x80004001).
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
    var settings = this.mozSettings;
    if (!settings || !navigator.mozSetMessageHandler)
      return;

    // register web activity handler
    navigator.mozSetMessageHandler('activity', this.webActivityHandler);

    // update <input> values when the corresponding setting is changed
    settings.onsettingchange = function settingChanged(event) {
      var key = event.settingName;
      var value = event.settingValue;
      var input = document.querySelector('input[name="' + key + '"]');
      if (!input)
        return;

      switch (input.dataset.type || input.type) { // bug344618
        case 'checkbox':
        case 'switch':
          if (input.checked == value)
            return;
          input.checked = value;
          break;
        case 'range':
          if (input.value == value)
            return;
          input.value = value;
          input.refresh(); // XXX to be removed when bug344618 lands
          break;
        case 'select':
          for (var i = 0; i < input.options.length; i++) {
            if (input.options[i].value == value) {
              input.options[i].selected = true;
              break;
            }
          }
          break;
      }
    };

    // preset all inputs that have a `name' attribute
    this.presetPanel();
  },

  loadPanel: function settings_loadPanel(panel) {
    if (!panel)
      return;

    // apply the HTML markup stored in the first comment node
    for (var i = 0; i < panel.childNodes.length; i++) {
      if (panel.childNodes[i].nodeType == document.COMMENT_NODE) {
        panel.innerHTML = panel.childNodes[i].nodeValue;
        break;
      }
    }

    // preset all inputs in the panel
    this.presetPanel(panel);

    // translate content
    navigator.mozL10n.translate(panel);

    // activate all scripts
    var scripts = panel.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var script = document.createElement('script');
      script.type = 'application/javascript';
      script.src = scripts[i].getAttribute('src');
      document.head.appendChild(script);
    }

    // activate all links
    var self = this;
    var links = panel.querySelectorAll('a[href^="http"], [data-href]');
    for (i = 0; i < links.length; i++) {
      var link = links[i];
      if (!link.dataset.href) {
        link.dataset.href = link.href;
        link.href = '#';
      }
      if (!link.dataset.href.startsWith('#')) { // external link
        link.onclick = function() {
          openLink(this.dataset.href);
          return false;
        };
      } else if (!link.dataset.href.endsWith('Settings')) { // generic dialog
        link.onclick = function() {
          openDialog(this.dataset.href.substr(1));
          return false;
        };
      } else { // Settings-specific dialog box
        link.onclick = function() {
          self.openDialog(this.dataset.href.substr(1));
          return false;
        };
      }
    }

    // display panel if required
    panel.hidden = false;
  },

  presetPanel: function settings_presetPanel(panel) {
    var settings = this.mozSettings;
    if (!settings)
      return;

    // preset all inputs that have a `name' attribute
    var lock = settings.createLock();
    var request = lock.get('*');
    request.onsuccess = function(e) {
      panel = panel || document;

      // preset all checkboxes
      var rule = 'input[type="checkbox"]:not([data-ignore])';
      var checkboxes = panel.querySelectorAll(rule);
      for (var i = 0; i < checkboxes.length; i++) {
        var key = checkboxes[i].name;
        if (key && request.result[key] != undefined) {
          checkboxes[i].checked = !!request.result[key];
        }
      }

      // preset all radio buttons
      rule = 'input[type="radio"]:not([data-ignore])';
      var radios = panel.querySelectorAll(rule);
      for (i = 0; i < radios.length; i++) {
        var key = radios[i].name;
        if (key && request.result[key] != undefined) {
          radios[i].checked = (request.result[key] === radios[i].value);
        }
      }

      // preset all text inputs
      rule = 'input[type="text"]:not([data-ignore])';
      var texts = panel.querySelectorAll(rule);
      for (i = 0; i < texts.length; i++) {
        var key = texts[i].name;
        if (key && request.result[key] != undefined) {
          texts[i].value = request.result[key];
        }
      }

      // preset all range inputs
      rule = 'input[type="range"]:not([data-ignore])';
      var ranges = panel.querySelectorAll(rule);
      for (i = 0; i < ranges.length; i++) {
        var key = ranges[i].name;
        if (key && request.result[key] != undefined) {
          ranges[i].value = parseFloat(request.result[key]);
          ranges[i].refresh(); // XXX to be removed when bug344618 lands
        }
      }

      // preset all select
      var selects = panel.querySelectorAll('select');
      for (i = 0; i < selects.length; i++) {
        var key = selects[i].name;
        if (key && request.result[key] != undefined) {
          var value = request.result[key];
          var option = 'option[value="' + value + '"]';
          var selectOption = selects[i].querySelector(option);
          if (selectOption) {
            selectOption.selected = true;
          }
        }
      }

      // preset all span with data-name fields
      rule = 'span[data-name]:not([data-ignore])';
      var spanFields = panel.querySelectorAll(rule);
      for (i = 0; i < spanFields.length; i++) {
        var key = spanFields[i].dataset.name;
        if (key && request.result[key] != undefined)
          spanFields[i].textContent = request.result[key];
      }
    };
  },

  webActivityHandler: function settings_handleActivity(activityRequest) {
    var name = activityRequest.source.name;
    switch (name) {
      case 'configure':
        var section = activityRequest.source.data.section || 'root';

        // Validate if the section exists
        var sectionElement = document.getElementById(section);
        if (!sectionElement || sectionElement.tagName !== 'SECTION') {
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
  },

  handleEvent: function settings_handleEvent(event) {
    var input = event.target;
    var type = input.dataset.type || input.type; // bug344618
    var key = input.name;

    var settings = window.navigator.mozSettings;
    if (!key || !settings || event.type != 'change')
      return;

    var value;
    switch (type) {
      case 'checkbox':
      case 'switch':
        value = input.checked; // boolean
        break;
      case 'range':
        value = parseFloat(input.value).toFixed(1); // float
        break;
      case 'select-one':
      case 'radio':
      case 'text':
      case 'password':
        value = input.value; // text
        break;
    }

    var cset = {}; cset[key] = value;
    settings.createLock().set(cset);
  },

  loadGaiaCommit: function settings_loadGaiaCommit() {
    var GAIA_COMMIT = 'resources/gaia_commit.txt';
    var dispDate = document.getElementById('gaia-commit-date');
    var dispHash = document.getElementById('gaia-commit-hash');
    if (dispHash.textContent)
      return; // `gaia-commit.txt' has already been loaded

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
          // XXX it would be great to pop a link to the github page
          // showing the commit but there doesn't seem to be any way
          // to tell the browser to do it.
          var d = new Date(parseInt(data[1] + '000', 10));
          dispDate.textContent = dateToUTC(d);
          dispHash.textContent = data[0];
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
    }

    reset(); // preset all fields before opening the dialog
    openDialog(dialogID, submit);
  },

  openUserGuide: function settings_openUserGuide() {
    var settings = this.mozSettings;
    if (!settings)
      return;

    var key = 'deviceinfo.os';
    var req = settings.createLock().get(key);
    req.onsuccess = function userGuide() {
      var url = 'http://support.mozilla.org/1/firefox-os/' +
        req.result[key] + '/gonk/' + document.documentElement.lang + '/';
      openLink(url);
    };
  },

  checkForUpdates: function settings_checkForUpdates() {
    var settings = this.mozSettings;
    if (!settings) {
      return;
    }

    var _ = navigator.mozL10n.get;
    var updateStatus = document.getElementById('update-status');

    updateStatus.textContent = _('checking-for-update');
    updateStatus.hidden = false;

    settings.addObserver('gecko.updateStatus', function onUpdateStatus(event) {
      var value = event.settingValue;
      switch (value) {
        case 'check-complete':
          updateStatus.hidden = true;
          break;
        default:
          updateStatus.textContent = _(value, null, value);
          break;
      }
      settings.removeObserver('gecko.updateStatus', onUpdateStatus);
    });

    var lock = settings.createLock();
    lock.set({
      'gaia.system.checkForUpdates': true
    });
  }
};

// apply user changes to 'Settings' + panel navigation
window.addEventListener('load', function loadSettings() {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Settings);
  window.addEventListener('click', Settings); // XXX really needed?
  Settings.init();

  // panel lazy-loading
  function lazyLoad(panel) {
    if (panel.children.length) // already initialized
      return;

    // load the panel and its sub-panels (dependencies)
    // (load the main panel last because it contains the scripts)
    var selector = 'section[id^="' + panel.id + '-"]';
    var subPanels = document.querySelectorAll(selector);
    for (var i = 0; i < subPanels.length; i++) {
      Settings.loadPanel(subPanels[i]);
    }
    Settings.loadPanel(panel);

    // panel-specific initialization tasks
    switch (panel.id) {
      case 'display':             // <input type="range"> + brightness control
        bug344618_polyfill();     // XXX to be removed when bug344618 is fixed
        var manualBrightness = panel.querySelector('#brightness-manual');
        var autoBrightnessSetting = 'screen.automatic-brightness';
        var settings = Settings.mozSettings;
        if (!settings)
          return;
        settings.addObserver(autoBrightnessSetting, function(event) {
          manualBrightness.hidden = event.settingValue;
        });
        var req = settings.createLock().get(autoBrightnessSetting);
        req.onsuccess = function brightness_onsuccess() {
          manualBrightness.hidden = req.result[autoBrightnessSetting];
        };
        break;
      case 'sound':               // <input type="range">
        bug344618_polyfill();     // XXX to be removed when bug344618 is fixed
        break;
      case 'languages':           // update date and time samples
        var d = new Date();
        var f = new navigator.mozL10n.DateTimeFormat();
        var _ = navigator.mozL10n.get;
        panel.querySelector('#region-date').textContent =
            f.localeFormat(d, _('longDateFormat'));
        panel.querySelector('#region-time').textContent =
            f.localeFormat(d, _('shortTimeFormat'));
        break;
      case 'about':               // handle specific link + load gaia_commit.txt
        document.getElementById('check-update-now').onclick =
          Settings.checkForUpdates.bind(Settings);
        Settings.loadGaiaCommit();
        break;
      case 'help':                // handle specific link
        document.querySelector('[data-l10n-id="user-guide"]').onclick =
          Settings.openUserGuide.bind(Settings);
        break;
      case 'mediaStorage':        // full media storage status + panel startup
        MediaStorage.initUI();
        break;
      case 'deviceStorage':       // full device storage status
        AppStorage.update();
        break;
      case 'battery':             // full battery status
        Battery.update();
        break;
    }
  }

  // panel navigation
  var oldHash = window.location.hash || '#root';
  function showPanel() {
    var hash = window.location.hash;
    var oldPanel = document.querySelector(oldHash);
    var newPanel = document.querySelector(hash);

    // load panel (+ dependencies) if necessary -- this should be synchronous
    lazyLoad(newPanel);

    // switch previous/current classes -- the timeout is required to make the
    // transition smooth after lazy-loading a panel
    setTimeout(function switchPanel() {
      oldPanel.className = newPanel.className ? '' : 'previous';
      newPanel.className = 'current';
      oldHash = hash;

      /**
       * Most browsers now scroll content into view taking CSS transforms into
       * account.  That's not what we want when moving between <section>s,
       * because the being-moved-to section is offscreen when we navigate to its
       * #hash.  The transitions assume the viewport is always at document 0,0.
       * So add a hack here to make that assumption true again.
       * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
       */
      if ((window.scrollX !== 0) || (window.scrollY !== 0)) {
        window.scrollTo(0, 0);
      }
    });
  }

  // startup
  window.addEventListener('hashchange', showPanel);
  switch (window.location.hash) {
    case '':
      document.location.hash = 'root';
      break;
    case '#root':
      document.getElementById('root').className = 'current';
      showPanel();
      break;
    default:
      document.getElementById('root').className = 'previous';
      showPanel();
      break;
  }
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
      document.location.hash = '#root';
    }
  } else if (event.keyCode === event.DOM_VK_RETURN) {
    event.target.blur();
    event.stopPropagation();
    event.preventDefault();
  }
});

// startup & language switching
window.addEventListener('localized', function showLanguages() {
  // set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // display the current locale in the main panel
  var LANGUAGES = 'resources/languages.json';
  if (Settings.languages) {
    document.getElementById('language-desc').textContent =
        Settings.languages[navigator.mozL10n.language.code];
  } else {
    // store supported languages in `Settings.language'
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function loadSupportedLocales() {
      if (xhr.readyState === 4) {
        if (xhr.status === 0 || xhr.status === 200) {
          Settings.languages = JSON.parse(xhr.responseText);
          document.getElementById('language-desc').textContent =
              Settings.languages[navigator.mozL10n.language.code];
        } else {
          console.error('Failed to fetch languages.json: ', xhr.statusText);
        }
      }
    };
    xhr.open('GET', LANGUAGES, true); // async
    xhr.responseType = 'text';
    xhr.send();
  }
});

