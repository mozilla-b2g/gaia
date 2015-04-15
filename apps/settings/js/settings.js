/* global TelephonySettingHelper */
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
        Settings.currentPanel = Settings.initialPanelForTablet;
      }
    }
    Settings._isTabletAndLandscapeLastTime = isTabletAndLandscapeThisTime;
  },

  initialPanelForTablet: '#wifi',

  _currentPanel: null,

  get currentPanel() {
    return this._currentPanel;
  },

  set currentPanel(hash) {
    if (!hash.startsWith('#')) {
      hash = '#' + hash;
    }

    if (hash === this._currentPanel) {
      return;
    }

    // take off # first
    var panelID = hash;
    if (panelID.startsWith('#')) {
      panelID = panelID.substring(1);
    }

    this.SettingsService.navigate(panelID, this._initialOptions);
  },

  get _initialOptions() {
    // After initial navigation, initial panel options are not necessary.
    delete this._initialOptions;
    // If initial panel has options, use them once at initial navigation.
    return window.LaunchContext.activityHandler &&
      window.LaunchContext.activityHandler.targetPanelOptions;
  },

  init: function settings_init(options) {
    if (!this.mozSettings || !navigator.mozSetMessageHandler) {
      return;
    }

    this.SettingsService = options.SettingsService;
    this.ScreenLayout = options.ScreenLayout;

    // XXX: We need to set to currentPanel here although SettingsService already
    //      knows the default panel id. This line will be removed along with
    //      "currentPanel" soon.
    this.currentPanel = window.LaunchContext.initialPanelId;

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
        this.currentPanel = this.initialPanelForTablet;
      }

      window.addEventListener('keydown', this.handleSpecialKeys);
    }).bind(this));

    PerformanceTestingHelper.dispatch('startup-path-done');
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
