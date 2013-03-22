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

  // Early initialization of parts of the application that don't
  // depend on the DOM being loaded.
  preInit: function settings_preInit() {
    var settings = this.mozSettings;
    if (!settings)
      return;

    // Make a request for settings to warm the cache, since we need it
    // very soon in startup after the DOM is available.
    this.getSettings(null);

    // update corresponding setting when it changes
    settings.onsettingchange = (function settingChanged(event) {
      var key = event.settingName;
      var value = event.settingValue;

      // Always update the cache if it's present, even if the DOM
      // isn't loaded yet.
      if (this._settingsCache) {
        this._settingsCache[key] = value;
      }

      // DOM isn't ready so there's nothing to update.
      if (!this._initialized) {
        return;
      }

      // update <span> values when the corresponding setting is changed
      var rule = '[data-name="' + key + '"]:not([data-ignore])';
      var spanField = document.querySelector(rule);
      if (spanField) {
        // check whether this setting comes from a select option
        var options = document.querySelector('select[data-setting="' +
          key + '"]');
        if (options) {
          // iterate option matching
          var max = options.length;
          for (var i = 0; i < max; i++) {
            if (options[i] && options[i].value === value) {
              spanField.dataset.l10nId = options[i].dataset.l10nId;
              spanField.textContent = options[i].textContent;
            }
          }
        } else {
          spanField.textContent = value;
        }
      }

      // update <input> values when the corresponding setting is changed
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
    }).bind(this);
  },

  _initialized: false,

  init: function settings_init() {
    this._initialized = true;

    if (!this.mozSettings || !navigator.mozSetMessageHandler) {
      return;
    }

    // register web activity handler
    navigator.mozSetMessageHandler('activity', this.webActivityHandler);

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

    // translate content
    navigator.mozL10n.translate(panel);

    // activate all scripts
    var scripts = panel.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src');
      if (document.head.querySelector('script[src="' + src + '"]')) {
        continue;
      }

      var script = document.createElement('script');
      script.type = 'application/javascript';
      script.src = src;
      document.head.appendChild(script);
    }

    // activate all stylesheets
    var stylesheets = panel.querySelectorAll('link');
    for (var i = 0; i < stylesheets.length; i++) {
      var href = stylesheets[i].getAttribute('href');
      if (document.head.querySelector('link[href="' + href + '"]'))
        continue;

      var stylesheet = document.createElement('link');
      stylesheet.type = 'text/css';
      stylesheet.rel = 'stylesheet';
      stylesheet.href = href;
      document.head.appendChild(stylesheet);
    }

    // activate all links
    var self = this;
    var rule = 'a[href^="http"], a[href^="tel"], [data-href]';
    var links = panel.querySelectorAll(rule);
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
  },

  // Cache of all current settings values.  There's some large stuff
  // in here, but not much useful can be done with the settings app
  // without these, so we keep this around most of the time.
  _settingsCache: null,

  get settingsCache() {
    return this._settingsCache;
  },

  // True when a request has already been made to fill the settings
  // cache.  When this is true, no further get("*") requests should be
  // made; instead, pending callbacks should be added to
  // _pendingSettingsCallbacks.
  _settingsCacheRequestSent: false,

  // There can be race conditions in which we need settings values,
  // but haven't filled the cache yet.  This array tracks those
  // listeners.
  _pendingSettingsCallbacks: [],

  // Invoke |callback| with a request object for a successful fetch of
  // settings values, when those values are ready.
  getSettings: function(callback) {
    var settings = this.mozSettings;
    if (!settings)
      return;

    if (this._settingsCache && callback) {
      // Fast-path that we hope to always hit: our settings cache is
      // already available, so invoke the callback now.
      callback(this._settingsCache);
      return;
    }

    if (!this._settingsCacheRequestSent && !this._settingsCache) {
      this._settingsCacheRequestSent = true;
      var lock = settings.createLock();
      var request = lock.get('*');
      request.onsuccess = function(e) {
        var result = request.result;
        var cachedResult = {};
        for (var attr in result) {
          cachedResult[attr] = result[attr];
        }
        Settings._settingsCache = cachedResult;
        var cbk;
        while ((cbk = Settings._pendingSettingsCallbacks.pop())) {
          cbk(result);
        }
      };
    }
    if (callback) {
      this._pendingSettingsCallbacks.push(callback);
    }
  },

  presetPanel: function settings_presetPanel(panel) {
    this.getSettings(function(result) {
      panel = panel || document;

      // preset all checkboxes
      var rule = 'input[type="checkbox"]:not([data-ignore])';
      var checkboxes = panel.querySelectorAll(rule);
      for (var i = 0; i < checkboxes.length; i++) {
        var key = checkboxes[i].name;
        if (key && result[key] != undefined) {
          checkboxes[i].checked = !!result[key];
        }
      }

      // remove initial class so the swich animation will apply
      // on these toggles if user interact with it.
      setTimeout(function() {
        for (var i = 0; i < checkboxes.length; i++) {
          if (checkboxes[i].classList.contains('initial')) {
            checkboxes[i].classList.remove('initial');
          }
        }
      }, 0);

      // preset all radio buttons
      rule = 'input[type="radio"]:not([data-ignore])';
      var radios = panel.querySelectorAll(rule);
      for (i = 0; i < radios.length; i++) {
        var key = radios[i].name;
        if (key && result[key] != undefined) {
          radios[i].checked = (result[key] === radios[i].value);
        }
      }

      // preset all text inputs
      rule = 'input[type="text"]:not([data-ignore])';
      var texts = panel.querySelectorAll(rule);
      for (i = 0; i < texts.length; i++) {
        var key = texts[i].name;
        if (key && result[key] != undefined) {
          texts[i].value = result[key];
        }
      }

      // preset all range inputs
      rule = 'input[type="range"]:not([data-ignore])';
      var ranges = panel.querySelectorAll(rule);
      for (i = 0; i < ranges.length; i++) {
        var key = ranges[i].name;
        if (key && result[key] != undefined) {
          ranges[i].value = parseFloat(result[key]);
          ranges[i].refresh(); // XXX to be removed when bug344618 lands
        }
      }

      // use a <button> instead of the <select> element
      var fakeSelector = function(select) {
        var parent = select.parentElement;
        var button = select.previousElementSibling;
        // link the button with the select element
        var index = select.selectedIndex;
        if (index >= 0) {
          button.textContent = select.options[index].textContent;
        }
        if (parent.classList.contains('fake-select')) {
          select.addEventListener('change', function() {
            var newSelect = this.options[this.selectedIndex].textContent;
            button.textContent = newSelect;
          });
        }
      };

      // preset all select
      var selects = panel.querySelectorAll('select');
      for (var i = 0, count = selects.length; i < count; i++) {
        var select = selects[i];
        var key = select.name;
        if (key && result[key] != undefined) {
          var value = result[key];
          var option = 'option[value="' + value + '"]';
          var selectOption = select.querySelector(option);
          if (selectOption) {
            selectOption.selected = true;
          }
        }
        fakeSelector(select);
      }

      // preset all span with data-name fields
      rule = '[data-name]:not([data-ignore])';
      var spanFields = panel.querySelectorAll(rule);
      for (i = 0; i < spanFields.length; i++) {
        var key = spanFields[i].dataset.name;

        if (key && result[key] != undefined) {
          // check whether this setting comes from a select option
          // (it may be in a different panel, so query the whole document)
          rule = '[data-setting="' + key + '"] ' +
            '[value="' + result[key] + '"]';
          var option = document.querySelector(rule);
          if (option) {
            spanFields[i].dataset.l10nId = option.dataset.l10nId;
            spanFields[i].textContent = option.textContent;
          } else {
            spanFields[i].textContent = result[key];
          }
        } else { // result[key] is undefined
          switch (key) {
            //XXX bug 816899 will also provide 'deviceinfo.software' from Gecko
            //  which is {os name + os version}
            case 'deviceinfo.software':
              var _ = navigator.mozL10n.get;
              var text = _('brandShortName') + ' ' +
                result['deviceinfo.os'];
              spanFields[i].textContent = text;
              break;

            //XXX workaround request from bug 808892 comment 22
            //  hide this field if it's undefined/empty.
            case 'deviceinfo.firmware_revision':
              spanFields[i].parentNode.hidden = true;
              break;
          }
        }
      }
    });
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

    // Not touching <input> with data-setting attribute here
    // because they would have to be committed with a explicit "submit"
    // of their own dialog.
    if (input.dataset.setting)
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
        value = input.value; // default as text
        if (input.dataset.valueType === 'integer') // integer
          value = parseInt(value);
        break;
    }

    var cset = {}; cset[key] = value;
    settings.createLock().set(cset);
  },

  openDialog: function settings_openDialog(dialogID) {
    var settings = this.mozSettings;
    var dialog = document.getElementById(dialogID);
    var fields =
        dialog.querySelectorAll('[data-setting]:not([data-ignore])');

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
     * XXX warning:
     * this only supports text/password/radio/select/radio input types.
     */

    // initialize all setting fields in the dialog box
    // XXX for fields being added by lazily loaded script,
    // it would have to initialize the fields again themselves.
    function reset() {
      if (settings) {
        var lock = settings.createLock();
        for (var i = 0; i < fields.length; i++) {
          (function(input) {
            var key = input.dataset.setting;
            var request = lock.get(key);
            request.onsuccess = function() {
              switch (input.type) {
                case 'radio':
                  input.checked = (input.value == request.result[key]);
                  break;
                case 'checkbox':
                  input.checked = request.result[key] || false;
                  break;
                default:
                  input.value = request.result[key] || '';
                  break;
              }
            };
          })(fields[i]);
        }
      }
    }

    // validate all settings in the dialog box
    function submit() {
      if (settings) {
        // Update the fields node list to include dynamically added fields
        fields = dialog.querySelectorAll('[data-setting]:not([data-ignore])');

        // mozSettings does not support multiple keys in the cset object
        // with one set() call,
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=779381
        var lock = settings.createLock();
        for (var i = 0; i < fields.length; i++) {
          var input = fields[i];
          var cset = {};
          var key = input.dataset.setting;
          switch (input.type) {
            case 'radio':
              if (input.checked)
                cset[key] = input.value;
              break;
            case 'checkbox':
                cset[key] = input.checked;
              break;
            default:
              cset[key] = input.value;
              break;
          }
          lock.set(cset);
        }
      }
    }

    reset(); // preset all fields before opening the dialog
    openDialog(dialogID, submit);
  },

  getSupportedLanguages: function settings_getLanguages(callback) {
    var LANGUAGES = 'shared/resources/languages.json';

    if (this._languages) {
      callback(this._languages);
    } else {
      var self = this;
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function loadSupportedLocales() {
        if (xhr.readyState === 4) {
          if (xhr.status === 0 || xhr.status === 200) {
            self._languages = xhr.response;
            callback(self._languages);
          } else {
            console.error('Failed to fetch languages.json: ', xhr.statusText);
          }
        }
      };
      xhr.open('GET', LANGUAGES, true); // async
      xhr.responseType = 'json';
      xhr.send();
    }
  },

  updateLanguagePanel: function settings_updateLanguagePanel() {
    var panel = document.getElementById('languages');
    if (panel) { // update the date and time samples in the 'languages' panel
      var d = new Date();
      var f = new navigator.mozL10n.DateTimeFormat();
      var _ = navigator.mozL10n.get;
      panel.querySelector('#region-date').textContent =
          f.localeFormat(d, _('longDateFormat'));
      panel.querySelector('#region-time').textContent =
          f.localeFormat(d, _('shortTimeFormat'));
    }
  }
};

// apply user changes to 'Settings' + panel navigation
window.addEventListener('load', function loadSettings() {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Settings);

  Settings.init();
  handleRadioAndCardState();

  setTimeout(function() {
    var scripts = [
      'js/utils.js',
      'shared/js/mouse_event_shim.js',
      'js/airplane_mode.js',
      'js/battery.js',
      'js/app_storage.js',
      'js/media_storage.js',
      'shared/js/mobile_operator.js',
      'js/connectivity.js',
      'js/security_privacy.js',
      'js/icc_menu.js'
    ];
    scripts.forEach(function attachScripts(src) {
      var script = document.createElement('script');
      script.src = src;
      document.head.appendChild(script);
    });
  });

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
      case 'languages':           // fill language selector
        var langSel = document.querySelector('select[name="language.current"]');
        langSel.innerHTML = '';
        Settings.getSupportedLanguages(function fillLanguageList(languages) {
          for (var lang in languages) {
            var option = document.createElement('option');
            option.value = lang;
            option.textContent = languages[lang];
            option.selected = (lang == document.documentElement.lang);
            langSel.appendChild(option);
          }
        });
        Settings.updateLanguagePanel();
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

    // preset all inputs in the panel and subpanels.
    for (var i = 0; i < subPanels.length; i++) {
      Settings.presetPanel(subPanels[i]);
    }
    Settings.presetPanel(panel);
  }

  // panel navigation
  var oldHash = window.location.hash || '#root';
  function showPanel() {
    var hash = window.location.hash;

    var oldPanel = document.querySelector(oldHash);
    var newPanel = document.querySelector(hash);

    // load panel (+ dependencies) if necessary -- this should be synchronous
    lazyLoad(newPanel);

    // switch previous/current/forward classes
    // FIXME: The '.peek' is here to avoid an ugly white
    // flickering when transitioning (gecko 18)
    // the forward class helps us 'peek' in the right direction
    oldPanel.className = newPanel.className ? 'peek' : 'peek previous forward';
    newPanel.className = newPanel.className ?
                           'current peek' : 'peek current forward';
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

    window.addEventListener('transitionend', function paintWait() {
      window.removeEventListener('transitionend', paintWait);

      // We need to wait for the next tick otherwise gecko gets confused
      setTimeout(function nextTick() {
        oldPanel.classList.remove('peek');
        oldPanel.classList.remove('forward');
        newPanel.classList.remove('peek');
        newPanel.classList.remove('forward');

        // Bug 818056 - When multiple visible panels are present,
        // they are not painted correctly. This appears to fix the issue.
        // Only do this after the first load
        if (oldPanel.className === 'current')
          return;

        oldPanel.addEventListener('transitionend', function onTransitionEnd() {
          oldPanel.removeEventListener('transitionend', onTransitionEnd);
          // Workaround for bug 825622, remove when fixed
          if (newPanel.id == 'about-licensing') {
            var iframe = document.getElementById('os-license');
            iframe.src = iframe.dataset.src;
          }
        });
      });
    });
  }

  function handleRadioAndCardState() {
    function updateDataSubpanelItem(disabled) {
      var item = document.getElementById('data-connectivity');
      var link = document.getElementById('menuItem-cellularAndData');
      if (!item || !link)
        return;

      if (disabled) {
        item.classList.add('carrier-disabled');
        link.onclick = function() { return false; };
      } else {
        item.classList.remove('carrier-disabled');
        link.onclick = null;
      }
    }

    function updateCallSubpanelItem(disabled) {
      var item = document.getElementById('call-settings');
      var link = document.getElementById('menuItem-callSettings');
      if (!item || !link)
        return;

      if (disabled) {
        item.classList.add('call-settings-disabled');
        link.onclick = function() { return false; };
      } else {
        item.classList.remove('call-settings-disabled');
        link.onclick = null;
      }
    }

    var key = 'ril.radio.disabled';

    var settings = Settings.mozSettings;
    if (!settings)
      return;

    var req = settings.createLock().get(key);
    req.onsuccess = function() {
      var value = req.result[key];
      updateDataSubpanelItem(value);
      updateCallSubpanelItem(value);
    };
    settings.addObserver(key, function(evt) {
      updateDataSubpanelItem(evt.settingValue);
      updateCallSubpanelItem(evt.settingValue);
    });
  }

  // startup
  window.addEventListener('hashchange', showPanel);
  switch (window.location.hash) {
    case '#root':
      // Nothing to do here; default startup case.
      break;
    case '':
      document.location.hash = 'root';
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
  Settings.getSupportedLanguages(function displayLang(languages) {
    document.getElementById('language-desc').textContent =
        languages[navigator.mozL10n.language.code];
  });
  Settings.updateLanguagePanel();
});

// Do initialization work that doesn't depend on the DOM, as early as
// possible in startup.
Settings.preInit();

MouseEventShim.trackMouseMoves = false;
