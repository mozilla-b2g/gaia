/* global PerformanceTestingHelper, TelephonySettingHelper,
   getSupportedLanguages */
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

  _isTabletAndLandscapeLastTime: null,

  rotate: function rotate(evt) {
    var isTabletAndLandscapeThisTime = Settings.isTabletAndLandscape();
    var panelsWithCurrentClass;
    if (Settings._isTabletAndLandscapeLastTime !==
        isTabletAndLandscapeThisTime) {
      panelsWithCurrentClass = document.querySelectorAll(
        'section[role="region"].current');
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
    // close the activity if the activity section is different than root panel.
    // XXX this assumes the 'back' button of the activity panel
    //     points to the root panel.
    if (this._currentActivity !== null &&
          (hash === '#home' ||
          (hash === '#root' && Settings._currentActivitySection !== 'root') ||
          (hash === '#call-iccs' && Settings._currentActivitySection !== 'root')
          )) {
      Settings.finishActivityRequest();
      return;
    }

    if (hash === '#wifi') {
      PerformanceTestingHelper.dispatch('start-wifi-list-test');
    }

    var panelID = hash;
    if (panelID.startsWith('#')) {
      panelID = panelID.substring(1);
    }

    this._currentPanel = hash;
    this.SettingsService.navigate(panelID);
  },

  _initialized: false,

  init: function settings_init(options) {
    this._initialized = true;

    if (!this.mozSettings || !navigator.mozSetMessageHandler) {
      return;
    }

    this.SettingsService = options.SettingsService;
    this.PageTransitions = options.PageTransitions;
    this.ScreenLayout = options.ScreenLayout;
    this.Connectivity = options.Connectivity;

    // register web activity handler
    navigator.mozSetMessageHandler('activity', this.webActivityHandler);

    this.currentPanel = 'root';

    // init connectivity when we get a chance
    navigator.mozL10n.once(function loadWhenIdle() {
      var idleObserver = {
        time: 3,
        onidle: function() {
          this.Connectivity.init();
          navigator.removeIdleObserver(idleObserver);
        }.bind(this)
      };
      navigator.addIdleObserver(idleObserver);
    }.bind(this));

    // make operations not block the load time
    setTimeout((function nextTick() {
      // With async pan zoom enable, the page starts with a viewport
      // of 980px before beeing resize to device-width. So let's delay
      // the rotation listener to make sure it is not triggered by fake
      // positive.
      this.ScreenLayout.watch(
        'tabletAndLandscaped',
        '(min-width: 768px) and (orientation: landscape)');
      window.addEventListener('screenlayoutchange', this.rotate);

      // WifiHelper is guaranteed to be loaded in main.js before calling to
      // this line.
      if (this.isTabletAndLandscape()) {
        self.currentPanel = self.defaultPanelForTablet;
      }

      window.addEventListener('keydown', this.handleSpecialKeys);
    }).bind(this));

    PerformanceTestingHelper.dispatch('startup-path-done');
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

    Settings._currentActivitySection = null;
  },

  // When we finish an activity we need to leave the DOM
  // as it was before handling the activity.
  restoreDOMFromActivty: function settings_restoreDOMFromActivity() {
    var currentPanel = document.querySelector('[data-dialog]');
    if (currentPanel !== null) {
      delete currentPanel.dataset.dialog;
    }
    delete document.body.dataset.filterBy;
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
        section = Settings._currentActivitySection =
                  activityRequest.source.data.section;

        if (!section) {
          // If there isn't a section specified,
          // simply show ourselve without making ourselves a dialog.
          Settings._currentActivity = null;
          return;
        }

        // Validate if the section exists
        var sectionElement = document.getElementById(section);
        if (!sectionElement || sectionElement.tagName !== 'SECTION') {
          var msg = 'Trying to open an non-existent section: ' + section;
          console.warn(msg);
          activityRequest.postError(msg);
          return;
        } else if (section === 'root') {
          var filterBy = activityRequest.source.data.filterBy;
          if (filterBy) {
            document.body.dataset.filterBy = filterBy;
          }
        } else if (section === 'call') {
          var serviceId = activityRequest.source.data.serviceId;
          if (serviceId) {
            DsdsSettings.setIccCardIndexForCallSettings(serviceId);
          }
        }

        // Go to that section
        setTimeout(function settings_goToSection() {
          Settings.currentPanel = section;
        });
        break;
      default:
        Settings._currentActivity = Settings._currentActivitySection = null;
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

  /**
   * back button = close dialog || back to the root page
   * + prevent the [Return] key to validate forms
   */
  handleSpecialKeys: function settings_handleSpecialKeys(event) {
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
  }
};
