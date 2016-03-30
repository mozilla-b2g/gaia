/* global LazyLoader */
/* global Awesomescreen */
/* global SyncBrowserDB */
/* global SyncManagerBridge */
/* global SettingsListener */
/* global FirefoxSyncTabList */

'use strict';

(function(exports) {
  const DEBUG = false;
  function debug() {
    if (DEBUG) {
      console.log('[FirefoxSyncTabNavigation] ' +
        Array.slice(arguments).concat());
    }
  }

  const TAB_SETTING = 'sync.collections.tabs.enabled';

  var FirefoxSyncTabNavigation = {
    init() {
      this.isTabOptionEnabled = false;

      this.tabOptionEl = document.getElementById('sync-tab-option');

      LazyLoader.load('shared/js/settings_listener.js').then(() => {
        SettingsListener.observe(TAB_SETTING, true, isEnabled => {
          debug(TAB_SETTING + ' changed to ' + isEnabled);
          this.isTabOptionEnabled = isEnabled;
          if (isEnabled) {
            this.showTabNavigationOption();
          } else {
            this.hideTabNavigationOption();
            this.restoreTabNavigation();
          }
        });
      });

      SyncManagerBridge.addListener(this.onSyncChange.bind(this));

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.refresh();
        }
      });

      this.refresh();
    },

    refresh() {
      SyncManagerBridge.getInfo().then(this.onSyncChange.bind(this));
    },

    onSyncChange(message) {
      debug(JSON.stringify(message));
      if (!message || !message.state) {
        throw new Error('Missing sync state');
      }
      switch (message.state) {
        case 'disabled':
          if (this.isTabNavigationOptionDisplayed()) {
            FirefoxSyncTabList.clean();
            this.restoreTabNavigation();
            this.hideTabNavigationOption();
          }
          break;
        case 'enabled':
          /**
           * Show sync tab option when sync tab collection is enables but the
           * sync tab option didn't display
           */
          if (this.isTabOptionEnabled &&
            !this.isTabNavigationOptionDisplayed()) {
            this.showTabNavigationOption();
          }

          /**
           * Update FirefoxSyncTabList when sync-tab option is enable
           */
          if (this.isTabNavigationOptionDisplayed()) {
            SyncBrowserDB.getAllDeviceTabs(tabData => {
              FirefoxSyncTabList.update(tabData);
            });
          }
          break;
      }
      this.state = message.state;
    },

    showTabNavigationOption() {
      this.tabOptionEl.hidden = false;
    },

    hideTabNavigationOption() {
      this.tabOptionEl.hidden = true;
    },

    isTabNavigationOptionDisplayed() {
      return !this.tabOptionEl.hidden;
    },

    isTabNavigationOptionActive() {
      return this.tabOptionEl.classList.contains('active');
    },

    restoreTabNavigation() {
      if (this.isTabNavigationOptionActive()) {
        Awesomescreen.restoreDefaultContentView();
      }
    }
  };

  exports.FirefoxSyncTabNavigation = FirefoxSyncTabNavigation;

  LazyLoader.load([
    'js/sync/manager_bridge.js',
    'js/sync/tabList.js'], () => {
    FirefoxSyncTabNavigation.init();
  });

})(window);
