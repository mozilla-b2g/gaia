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
    return this.ScreenLayout.getCurrentLayout('tabletAndLandscaped');
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

  defaultPanelForTablet: '#wifi',

  _currentPanel: null,

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

    var panelID = hash;
    if (panelID.startsWith('#')) {
      panelID = panelID.substring(1);
    }

    this._currentPanel = hash;
    this.SettingsService.navigate(panelID, null, function() {
      switch (hash) {
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

  _initialized: false,

  init: function settings_init(options) {
    this._initialized = true;

    if (!this.mozSettings || !navigator.mozSetMessageHandler) {
      return;
    }

    this.SettingsService = options.SettingsService;
    this.SettingsCache = options.SettingsCache;
    this.PageTransitions = options.PageTransitions;
    this.LazyLoader = options.LazyLoader;
    this.ScreenLayout = options.ScreenLayout;

    setTimeout((function nextTick() {
      this.LazyLoader.load(['js/utils.js'], startupLocale);

      this.LazyLoader.load(['shared/js/wifi_helper.js'], displayDefaultPanel);

      /**
       * Enable or disable the menu items related to the ICC card relying on the
       * card and radio state.
       */
      this.LazyLoader.load([
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
    }).bind(this));

    function displayDefaultPanel() {
      // With async pan zoom enable, the page starts with a viewport
      // of 980px before beeing resize to device-width. So let's delay
      // the rotation listener to make sure it is not triggered by fake
      // positive.
      Settings.ScreenLayout.watch(
        'tabletAndLandscaped',
        '(min-width: 768px) and (orientation: landscape)');
      window.addEventListener('screenlayoutchange', Settings.rotate);

      // display of default panel(#wifi) must wait for
      // lazy-loaded script - wifi_helper.js - loaded
      if (Settings.isTabletAndLandscape()) {
        Settings.currentPanel = Settings.defaultPanelForTablet;
      }
    }

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

    this.currentPanel = 'root';
  },

  // Cache of all current settings values.  There's some large stuff
  // in here, but not much useful can be done with the settings app
  // without these, so we keep this around most of the time.
  get settingsCache() {
    return this.SettingsCache.cache;
  },

  // Invoke |callback| with a request object for a successful fetch of
  // settings values, when those values are ready.
  getSettings: function(callback) {
    this.SettingsCache.getSettings(callback);
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
    Settings._currentActivity = activityRequest;
    switch (name) {
      case 'configure':
        section = activityRequest.source.data.section;

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
          activityRequest.postError(msg);
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
  }
};

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
