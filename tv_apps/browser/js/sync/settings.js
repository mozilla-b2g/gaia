/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global LazyLoader */
/* global Settings */
/* global SettingsListener */
/* global SyncManagerBridge */

'use strict';

(function(exports) {
  const DEBUG = false;
  function debug() {
    if (DEBUG) {
      console.log('[FirefoxSyncSettings] ' + Array.slice(arguments).concat());
    }
  }

  // Screens
  const ENABLED = 'enabled';
  const DISABLED = 'disabled';

  const BOOKMARKS_SETTING = 'sync.collections.bookmarks.enabled';
  const HISTORY_SETTING = 'sync.collections.history.enabled';

  const ELEMENTS = [{
    screen: DISABLED,
    selector: '#fxsync-sign-in-button',
    event: 'mouseup',
    listener: 'enable'
  }, {
    screen: ENABLED,
    selector: '#fxsync-signed-in-as'
  }, {
    screen: ENABLED,
    selector: '#fxsync-sync-now-button',
    event: 'mouseup',
    listener: 'sync'
  }, {
    screen: ENABLED,
    selector: '#fxsync-sign-out-button',
    event: 'mouseup',
    listener: 'disable'
  }, {
    screen: ENABLED,
    selector: '#fxsync-collection-bookmarks',
    event: 'click',
    listener: 'onbookmarkschecked',
    init: 'onbookmarkschange'
  }, {
    screen: ENABLED,
    selector: '#fxsync-collection-history',
    event: 'click',
    listener: 'onhistorychecked',
    init: 'onhistorychange'
  }];

  function getElementName(str) {
    str = str.toLowerCase().replace('#fxsync-', '');
    return str.replace(/-([a-z])/g, g => {
      return g[1].toUpperCase();
    });
  }

  var FirefoxSyncSettings = {
    init() {
      this.area = document.querySelector('#fxsync-area');
      this.elements = {
        enabled: this.area.querySelector('#fxsync-enabled'),
        disabled: this.area.querySelector('#fxsync-disabled')
      };
      this.listeners = new Map();
      this.collections = new Map();
      this.screen = null;
      this.state = null;

      LazyLoader.load('shared/js/settings_listener.js').then(() => {
        [{
          name: BOOKMARKS_SETTING,
          onchange: 'onbookmarkschange'
        }, {
          name: HISTORY_SETTING,
          onchange: 'onhistorychange'
        }].forEach(setting => {
          SettingsListener.observe(setting.name, true, enabled => {
            enabled ? this.collections.set(setting.name, enabled)
                    : this.collections.delete(setting.name);
            this[setting.onchange]();
            this.maybeEnableSyncNow();
          });
        });
      });

      SyncManagerBridge.addListener(this.onsyncchange.bind(this));

      document.addEventListener('visibilitychange', () => {
        debug('Visibility change', document.hidden);
        if (!document.hidden) {
          this.refresh();
        }
      });

      this.refresh();
    },

    refresh() {
      SyncManagerBridge.getInfo().then(this.onsyncchange.bind(this));
    },

    onsyncchange(message) {
      debug(JSON.stringify(message));
      if (!message || !message.state) {
        throw new Error('Missing sync state');
      }
      switch (message.state) {
        case 'disabled':
          this.showScreen(DISABLED);
          break;
        case 'enabled':
          // We want to show the settings page once Sync is enabled
          // but we only want to do that if its enabled via user action
          // (and not because it is already enabled from a previous run).
          if (this.state === 'enabling') {
            Settings.show();
          }
          this.showScreen(ENABLED);
          this.showUser(message.user);
          this.showSyncNow();
          break;
        case 'syncing':
          this.showScreen(ENABLED);
          this.showSyncing();
          break;
        case 'errored':
          // XXX Will be done on bug 1215463
          break;
      }
      this.state = message.state;
    },

    onbookmarkschange() {
      if (!this.elements.collectionBookmarks) {
        return;
      }
      this.elements.collectionBookmarks.checked =
        this.collections.has(BOOKMARKS_SETTING);
    },

    onbookmarkschecked() {
      var checked = this.elements.collectionBookmarks.checked;
      checked ? this.collections.set(BOOKMARKS_SETTING, true)
              : this.collections.delete(BOOKMARKS_SETTING);
      navigator.mozSettings.createLock().set({
        'sync.collections.bookmarks.enabled': checked
      });
    },

    onhistorychange() {
      if (!this.elements.collectionBookmarks) {
        return;
      }
      this.elements.collectionHistory.checked =
        this.collections.has(HISTORY_SETTING);
    },

    onhistorychecked() {
      var checked = this.elements.collectionHistory.checked;
      checked ? this.collections.set(HISTORY_SETTING, true)
              : this.collections.delete(HISTORY_SETTING);
      navigator.mozSettings.createLock().set({
        'sync.collections.history.enabled': checked
      });
    },

    addListener(element, event, listenerName) {
      if (!element || !event || !listenerName) {
        return;
      }
      // Because we bind this to the listener, we need to save
      // the reference so we can remove it afterwards.
      var listener = this[listenerName].bind(this);
      element.addEventListener(event, listener);
      return listener;
    },

    removeListener(element, event, listener) {
      if (!element || !event || !listener) {
        return;
      }
      element.removeEventListener(event, listener);
    },

    loadElements(screen) {
      ELEMENTS.forEach(element => {
        var name = getElementName(element.selector);
        if (element.screen == screen) {
          this.elements[name] = this.area.querySelector(element.selector);
          this.listeners.set(
            name,
            this.addListener(this.elements[name],
                             element.event, element.listener)
          );
          if (element.init) {
            this[element.init]();
          }
          return;
        }

        if (!this.listeners.has(name)) {
          return;
        }
        this.removeListener(this.elements[name],
                            element.event, this.listeners.get(name));
        this.listeners.delete(name);
        this.elements[name] = null;
      });
    },

    showScreen(screen) {
      if (this.screen == screen) {
        return;
      }
      this.screen = screen;

      this.loadElements(screen);

      this.elements.enabled.hidden = (screen != ENABLED);
      this.elements.disabled.hidden = (screen != DISABLED);
    },

    showUser(user) {
      navigator.mozL10n.setAttributes(this.elements.signedInAs,
                                      'fxsync-signed-in-as', {
        email: user
      });
    },

    maybeEnableSyncNow() {
      if (!this.elements.syncNowButton) {
        return;
      }
      (this.collections.size <= 0) ?
        this.elements.syncNowButton.classList.add('disabled') :
        this.elements.syncNowButton.classList.remove('disabled');
    },

    disableSyncNowAndCollections(disabled) {
      ['collectionBookmarks',
       'collectionHistory'].forEach(name => {
        this.elements[name].disabled = disabled;
      });
      disabled ? this.elements.syncNowButton.classList.add('disabled')
               : this.elements.syncNowButton.classList.remove('disabled');
    },

    showSyncNow() {
      this.elements.syncNowButton.dataset.l10nId = 'fxsync-sync-now';
      this.disableSyncNowAndCollections(false);
      this.maybeEnableSyncNow();
    },

    showSyncing() {
      this.elements.syncNowButton.dataset.l10nId = 'fxsync-syncing';
      this.disableSyncNowAndCollections(true);
    },

    enable() {
      SyncManagerBridge.enable();
    },

    disable() {
      SyncManagerBridge.disable();
    },

    sync() {
      SyncManagerBridge.sync();
    }
  };

  exports.FirefoxSyncSettings = FirefoxSyncSettings;

  LazyLoader.load('js/sync/manager_bridge.js', () => {
    FirefoxSyncSettings.init();
  });
}(window));
