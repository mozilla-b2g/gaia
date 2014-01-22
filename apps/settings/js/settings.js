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

  isTabletAndLandscape: function is_tablet_and_landscape() {
    return ScreenLayout.getCurrentLayout('tabletAndLandscaped');
  },

  _panelsWithClass: function pane_with_class(targetClass) {
    return document.querySelectorAll(
      'section[role="region"].' + targetClass);
  },

  _isTabletAndLandscapeLastTime: null,

  rotate: function rotate(evt) {
    var isTabletAndLandscapeThisTime = Settings.isTabletAndLandscape();
    var panelsWithCurrentClass;
    if (Settings._isTabletAndLandscapeLastTime !==
        isTabletAndLandscapeThisTime) {
      panelsWithCurrentClass = Settings._panelsWithClass('current');
      // in two column style if we have only 'root' panel displayed,
      // (left: root panel, right: blank)
      // then show default panel too
      if (panelsWithCurrentClass.length === 1 &&
        panelsWithCurrentClass[0].id === 'root') {
        // go to default panel
        Settings.currentPanel = Settings.defaultPanelForTablet;
      }
    }
    Settings._isTabletAndLandscapeLastTime = isTabletAndLandscapeThisTime;
  },

  _transit: function transit(oldPanel, newPanel, callback) {
    if (this.isTabletAndLandscape()) {
      this._pageTransitions.twoColumn(oldPanel, newPanel, callback);
    } else {
      this._pageTransitions.oneColumn(oldPanel, newPanel, callback);
    }
  },

  _pageTransitions: {
    _sendPanelReady: function _send_panel_ready(oldPanelHash, newPanelHash) {
      var detail = {
        previous: oldPanelHash,
        current: newPanelHash
      };
      var event = new CustomEvent('panelready', {detail: detail});
      window.dispatchEvent(event);
    },
    oneColumn: function one_column(oldPanel, newPanel, callback) {
      var self = this;
      // switch previous/current classes
      oldPanel.className = newPanel.className ? '' : 'previous';
      newPanel.className = 'current';

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

      newPanel.addEventListener('transitionend', function paintWait() {
        newPanel.removeEventListener('transitionend', paintWait);

        // We need to wait for the next tick otherwise gecko gets confused
        setTimeout(function nextTick() {
          self._sendPanelReady('#' + oldPanel.id, '#' + newPanel.id);

          // Bug 818056 - When multiple visible panels are present,
          // they are not painted correctly. This appears to fix the issue.
          // Only do this after the first load
          if (oldPanel.className === 'current')
            return;

          if (callback)
            callback();
        });
      });
    },
    twoColumn: function two_column(oldPanel, newPanel, callback) {
      oldPanel.className = newPanel.className ? '' : 'previous';
      newPanel.className = 'current';

      this._sendPanelReady('#' + oldPanel.id, '#' + newPanel.id);

      if (callback) {
        callback();
      }
    }
  },

  defaultPanelForTablet: '#wifi',

  _currentPanel: '#root',

  _currentActivity: null,

  get currentPanel() {
    return this._currentPanel;
  },

  set currentPanel(hash) {
    if (!hash.startsWith('#')) {
      hash = '#' + hash;
    }

    if (hash == this._currentPanel) {
      return;
    }

    // If we're handling an activity and the 'back' button is hit,
    // close the activity.
    // XXX this assumes the 'back' button of the activity panel
    //     points to the root panel.
    if (this._currentActivity !== null && hash === '#root') {
      Settings.finishActivityRequest();
      return;
    }

    if (hash === '#wifi') {
      PerformanceTestingHelper.dispatch('start');
    }
    var oldPanelHash = this._currentPanel;
    var oldPanel = document.querySelector(this._currentPanel);
    this._currentPanel = hash;
    var newPanelHash = this._currentPanel;
    var newPanel = document.querySelector(this._currentPanel);

    // load panel (+ dependencies) if necessary -- this should be synchronous
    this.lazyLoad(newPanel);

    this._transit(oldPanel, newPanel, function() {
      switch (newPanel.id) {
        case 'about-licensing':
          // Workaround for bug 825622, remove when fixed
          var iframe = document.getElementById('os-license');
          iframe.src = iframe.dataset.src;
          break;
        case 'wifi':
          PerformanceTestingHelper.dispatch('settings-panel-wifi-visible');
          break;
      }
    });
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

      switch (input.type) {
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

    // hide telephony related entries if not supportted
    if (!navigator.mozTelephony) {
      var elements = ['call-settings',
                      'data-connectivity',
                      'messaging-settings',
                      'simSecurity-settings'];
      elements.forEach(function(el) {
        document.getElementById(el).hidden = true;
      });
    }

    // we hide all entry points by default,
    // so we have to detect and show them up
    if (navigator.mozMobileConnections) {
      if (navigator.mozMobileConnections.length == 1) {
        // single sim
        document.getElementById('simCardManager-settings').hidden = true;
      } else {
        // dsds
        document.getElementById('simSecurity-settings').hidden = true;
      }
    }

    // register web activity handler
    navigator.mozSetMessageHandler('activity', this.webActivityHandler);

    // preset all inputs that have a `name' attribute
    this.presetPanel();
  },

  loadPanel: function settings_loadPanel(panel, cb) {
    if (!panel) {
      return;
    }

    this.loadPanelStylesheetsIfNeeded();

    // apply the HTML markup stored in the first comment node
    LazyLoader.load([panel], this.afterPanelLoad.bind(this, panel, cb));
  },

  afterPanelLoad: function(panel, cb) {
    // translate content
    navigator.mozL10n.translate(panel);

    // activate all scripts
    var scripts = panel.getElementsByTagName('script');
    var scripts_src = Array.prototype.map.call(scripts, function(script) {
      return script.getAttribute('src');
    });
    LazyLoader.load(scripts_src);

    // activate all links
    var self = this;
    var rule = 'a[href^="http"], a[href^="tel"], [data-href]';
    var links = panel.querySelectorAll(rule);
    for (var i = 0, il = links.length; i < il; i++) {
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
    if (cb) {
      cb();
    }
  },

  lazyLoad: function settings_lazyLoad(panel) {
    if (panel.dataset.rendered) { // already initialized
      return;
    }
    panel.dataset.rendered = true;

    if (panel.dataset.requireSubPanels) {
      // load the panel and its sub-panels (dependencies)
      // (load the main panel last because it contains the scripts)
      var selector = 'section[id^="' + panel.id + '-"]';
      var subPanels = document.querySelectorAll(selector);
      for (var i = 0, il = subPanels.length; i < il; i++) {
        this.loadPanel(subPanels[i]);
      }
      this.loadPanel(panel, this.panelLoaded.bind(this, panel, subPanels));
    } else {
      this.loadPanel(panel, this.panelLoaded.bind(this, panel));
    }
  },

  panelLoaded: function(panel, subPanels) {
    // preset all inputs in the panel and subpanels.
    if (panel.dataset.requireSubPanels) {
      for (var i = 0; i < subPanels.length; i++) {
        this.presetPanel(subPanels[i]);
      }
    }
    this.presetPanel(panel);
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
        }
      }

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
      }

      // preset all span with data-name fields
      rule = '[data-name]:not([data-ignore])';
      var spanFields = panel.querySelectorAll(rule);
      for (i = 0; i < spanFields.length; i++) {
        var key = spanFields[i].dataset.name;

        if (key && result[key] && result[key] != 'undefined') {
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

            case 'deviceinfo.mac':
              var _ = navigator.mozL10n.get;
              spanFields[i].textContent = _('macUnavailable');
              break;
          }
        }
      }
    });
  },

  // An activity can be closed either by pressing the 'X' button
  // or by a visibility change (i.e. home button or app switch).
  finishActivityRequest: function settings_finishActivityRequest() {
    // Remove the dialog mark to restore settings status
    // once the animation from the activity finish.
    // If we finish the activity pressing home, we will have a
    // different animation and will be hidden before the animation
    // ends.
    if (document.hidden) {
      this.restoreDOMFromActivty();
    } else {
      var self = this;
      document.addEventListener('visibilitychange', function restore(evt) {
        if (document.hidden) {
          document.removeEventListener('visibilitychange', restore);
          self.restoreDOMFromActivty();
        }
      });
    }

    // Send a result to finish this activity
    if (Settings._currentActivity !== null) {
      Settings._currentActivity.postResult(null);
      Settings._currentActivity = null;
    }
  },

  // When we finish an activity we need to leave the DOM
  // as it was before handling the activity.
  restoreDOMFromActivty: function settings_restoreDOMFromActivity() {
    var currentPanel = document.querySelector('[data-dialog]');
    if (currentPanel !== null) {
      delete currentPanel.dataset.dialog;
    }
  },

  visibilityHandler: function settings_visibilityHandler(evt) {
    if (document.hidden) {
      Settings.finishActivityRequest();
      document.removeEventListener('visibilitychange',
        Settings.visibilityHandler);
    }
  },

  webActivityHandler: function settings_handleActivity(activityRequest) {
    var name = activityRequest.source.name;
    var section = 'root';
    var postback = true;
    Settings._currentActivity = activityRequest;
    switch (name) {
      case 'configure':
        section = activityRequest.source.data.section;
        if (typeof activityRequest.source.data.postback != 'undefined') {
          postback = activityRequest.source.data.postback;
        }

        if (!section) {
          // If there isn't a section specified,
          // simply show ourselve without making ourselves a dialog.
          Settings._currentActivity = null;
        }

        // Validate if the section exists
        var sectionElement = document.getElementById(section);
        if (!sectionElement || sectionElement.tagName !== 'SECTION') {
          var msg = 'Trying to open an non-existent section: ' + section;
          console.warn(msg);
          if (postback) {
            activityRequest.postError(msg);
          }
          return;
        }

        // Go to that section
        setTimeout(function settings_goToSection() {
          Settings.currentPanel = section;
        });
        break;
      default:
        Settings._currentActivity = null;
        break;
    }

    // Mark the desired panel as a dialog
    if (Settings._currentActivity !== null) {
      var domSection = document.getElementById(section);
      domSection.dataset.dialog = true;
      document.addEventListener('visibilitychange',
        Settings.visibilityHandler);
    }
  },

  handleEvent: function settings_handleEvent(event) {
    var input = event.target;
    var type = input.type;
    var key = input.name;

    var settings = window.navigator.mozSettings;
    //XXX should we check data-ignore here?
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
        // Bug 906296:
        //   We parseFloat() once to be able to round to 1 digit, then
        //   we parseFloat() again to make sure to store a Number and
        //   not a String, otherwise this will make Gecko unable to
        //   apply new settings.
        value = parseFloat(parseFloat(input.value).toFixed(1)); // float
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
                case 'select-one':
                  input.value = request.result[key] || '';
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
    if (!callback)
      return;

    if (this._languages) {
      callback(this._languages);
    } else {
      var self = this;
      var LANGUAGES = '/shared/resources/languages.json';
      loadJSON(LANGUAGES, function loadLanguages(data) {
        if (data) {
          self._languages = data;
          callback(self._languages);
        }
      });
    }
  },

  loadPanelStylesheetsIfNeeded: function settings_loadPanelStylesheetsIN() {
    var self = this;
    if (self._panelStylesheetsLoaded) {
      return;
    }

    LazyLoader.load(['shared/style/action_menu.css',
                     'shared/style/buttons.css',
                     'shared/style/confirm.css',
                     'shared/style/input_areas.css',
                     'shared/style_unstable/progress_activity.css',
                     'style/apps.css',
                     'style/phone_lock.css',
                     'style/simcard.css',
                     'style/updates.css'],
    function callback() {
      self._panelStylesheetsLoaded = true;
    });
  }
};

// apply user changes to 'Settings' + panel navigation
window.addEventListener('load', function loadSettings() {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Settings);

  navigator.addIdleObserver({
    time: 3,
    onidle: Settings.loadPanelStylesheetsIfNeeded.bind(Settings)
  });

  Settings.init();

  setTimeout(function nextTick() {
    LazyLoader.load(['js/utils.js'], startupLocale);

    LazyLoader.load(['shared/js/wifi_helper.js'], displayDefaultPanel);

    /**
     * Enable or disable the menu items related to the ICC card relying on the
     * card and radio state.
     */
    LazyLoader.load([
      'shared/js/airplane_mode_helper.js',
      'js/airplane_mode.js',
      'js/battery.js',
      'shared/js/async_storage.js',
      'js/storage.js',
      'js/try_show_homescreen_section.js',
      'shared/js/mobile_operator.js',
      'shared/js/icc_helper.js',
      'shared/js/settings_listener.js',
      'shared/js/toaster.js',
      'js/connectivity.js',
      'js/security_privacy.js',
      'js/icc_menu.js',
      'js/nfc.js',
      'js/dsds_settings.js',
      'js/telephony_settings.js',
      'js/telephony_items_handler.js'
    ], function() {
      TelephonySettingHelper.init();
    });
  });

  function displayDefaultPanel() {
    // With async pan zoom enable, the page starts with a viewport
    // of 980px before beeing resize to device-width. So let's delay
    // the rotation listener to make sure it is not triggered by fake
    // positive.
    ScreenLayout.watch(
      'tabletAndLandscaped',
      '(min-width: 768px) and (orientation: landscape)');
    window.addEventListener('screenlayoutchange', Settings.rotate);

    // display of default panel(#wifi) must wait for
    // lazy-loaded script - wifi_helper.js - loaded
    if (Settings.isTabletAndLandscape()) {
      Settings.currentPanel = Settings.defaultPanelForTablet;
    }
  }

  // startup
  document.addEventListener('click', function settings_backButtonClick(e) {
    var target = e.target;
    if (target.classList.contains('icon-back')) {
      Settings.currentPanel = target.parentNode.getAttribute('href');
    }
  });
  document.addEventListener('click', function settings_sectionOpenClick(e) {
    var target = e.target;
    var nodeName = target.nodeName.toLowerCase();
    if (nodeName != 'a') {
      return;
    }

    var href = target.getAttribute('href');
    // skips the following case:
    // 1. no href, which is not panel
    // 2. href is not a hash which is not a panel
    // 3. href equals # which is translated with loadPanel function, they are
    //    external links.
    if (!href || !href.startsWith('#') || href === '#') {
      return;
    }

    Settings.currentPanel = href;
    e.preventDefault();
  });
});

// back button = close dialog || back to the root page
// + prevent the [Return] key to validate forms
window.addEventListener('keydown', function handleSpecialKeys(event) {
  if (Settings.currentPanel != '#root' &&
      event.keyCode === event.DOM_VK_ESCAPE) {
    event.preventDefault();
    event.stopPropagation();

    var dialog = document.querySelector('#dialogs .active');
    if (dialog) {
      dialog.classList.remove('active');
      document.body.classList.remove('dialog');
    } else {
      Settings.currentPanel = '#root';
    }
  } else if (event.keyCode === event.DOM_VK_RETURN) {
    event.target.blur();
    event.stopPropagation();
    event.preventDefault();
  }
});

// startup & language switching
function startupLocale() {
  navigator.mozL10n.ready(function startupLocale() {
    initLocale();
    // XXX this might call `initLocale()` twice until bug 882592 is fixed
    window.addEventListener('localized', initLocale);
  });
}

function initLocale() {
  var lang = navigator.mozL10n.language.code;

  // set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = lang;
  document.documentElement.dir = navigator.mozL10n.language.direction;

  // display the current locale in the main panel
  Settings.getSupportedLanguages(function displayLang(languages) {
    document.getElementById('language-desc').textContent = languages[lang];
  });
}

// Do initialization work that doesn't depend on the DOM, as early as
// possible in startup.
Settings.preInit();
