/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ERROR_DIALOG_CLOSED_BY_USER */
/* global ERROR_INVALID_SYNC_ACCOUNT */
/* global ERROR_OFFLINE */
/* global ERROR_UNVERIFIED_ACCOUNT */
/* global ERROR_UNKNOWN */
/* global LazyLoader */
/* global mozIntl */

define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SyncManagerBridge = require('modules/sync_manager_bridge');
  var DialogService = require('modules/dialog_service');

  const LOGGED_OUT_SCREEN = 'loggedout';
  const LOGGED_IN_SCREEN = 'loggedin';

  const ELEMENTS = [{
    screen: LOGGED_OUT_SCREEN,
    selector: '.fxsync-login',
    event: 'click',
    listener: 'enable'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-logout',
    event: 'click',
    listener: 'disable'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-user'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-sync-now',
    event: 'click',
    listener: 'sync'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-tos',
    event: 'click',
    listener: 'openTos'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-privacy',
    event: 'click',
    listener: 'openPrivacy'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-collections-bookmarks'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-collections-history'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-collections-passwords'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-last-sync'
  }, {
    screen: LOGGED_IN_SCREEN,
    selector: '.fxsync-unverified'
  }];

  function getElementName(str) {
    str = str.toLowerCase().replace('.fxsync-', '');
    return str.replace(/-([a-z])/g, g => {
      return g[1].toUpperCase();
    });
  }

  function FirefoxSyncPanel(panel, screens) {
    this.panel = panel;
    this.screens = screens;
    this.elements = {};
    this.currentScreen = null;
    this.collections = new Map();
    ['sync.collections.bookmarks.enabled',
     'sync.collections.history.enabled',
     'sync.collections.passwords.enabled'].forEach(setting => {
      SettingsListener.observe(setting, true, enabled => {
        enabled ? this.collections.set(setting, enabled)
                : this.collections.delete(setting);
        this.maybeEnableSyncNow();
      });
    });

    SyncManagerBridge.onsyncchange = this.onsyncchange.bind(this);
  }

  FirefoxSyncPanel.prototype = {
    refresh() {
      SyncManagerBridge.getInfo().then(this.onsyncchange.bind(this));
    },

    clean() {
      window.clearTimeout(this.timeout);
      this.timeout = undefined;
    },

    /**
     * This is where most part of the panel logic lives.
     *
     * Here we handle Sync lifecycle events coming from the SyncManager
     * through the SyncMangerBridge. We react to these events by
     * changing the screen depending on the state.
     *
     * We have two possible different screens:
     *   1. Logged out screen. We simply show the user what Sync is and
     *      allow her to start using it or to keep walking.
     *   2. Logged in screen. We show to the user several different options:
     *     + The user owning the Sync account. If the account belongs to a
     *     verified user, we are fine, if not, we show a warning asking the
     *     user to verify her account and we disable all the options except
     *     the one to disable sync.
     *     + A button to disable sync. Clicking it will not log out from
     *     FxA, it will simply disable sync on the device.
     *     + A button to start a sync on demand. Clicking it will disable the
     *     button and the collections switches while the synchronization is
     *     being performaned. Once the sync is done successfully, we enable
     *     all the options back and refresh the last sync time.
     *     We disable this button if no collection is selected.
     *     + Last sync time. Show the last time a successful synchronization
     *     was done. If no previous synchronization exists for that login,
     *     we don't show this label.
     *     + Collections switches. Allow the user to select which collections
     *     she wants to keep synchronized. If no collection is selected, the
     *     synchronization will be disabled.
     *     + ToS and Privacy links.
     */
    onsyncchange(message) {
      if (!message || !message.state) {
        throw new Error('Missing sync state');
      }
      switch (message.state) {
        case 'disabled':
          this.showScreen(LOGGED_OUT_SCREEN);
          this.hideEnabling();
          this.clean();
          break;
        case 'enabling':
          this.showScreen(LOGGED_OUT_SCREEN);
          this.showEnabling();
          break;
        case 'enabled':
          this.hideEnabling();
          this.showScreen(LOGGED_IN_SCREEN);
          this.showSyncNow();
          this.showUser(message.user);
          this.showLastSync(message.lastSync);
          break;
        case 'syncing':
          this.showScreen(LOGGED_IN_SCREEN);
          // The user may enter in the panel while we are in the syncing
          // state. In that case, we also need to show the user because
          // the enabled state was not handled yet.
          this.showUser(message.user);
          this.showSyncing();
          break;
        case 'errored':
          LazyLoader.load('shared/js/sync/errors.js', () => {
            if (message.error == ERROR_UNVERIFIED_ACCOUNT) {
              this.showScreen(LOGGED_IN_SCREEN);
              this.showUnverified(message.user);
              return;
            }

            const IGNORED_ERRORS = [
              ERROR_DIALOG_CLOSED_BY_USER
            ];

            if (IGNORED_ERRORS.indexOf(message.error) > -1) {
              return;
            }

            var errorMsg = ERROR_UNKNOWN;
            var title;

            const KNOWN_ERRORS = [
              ERROR_INVALID_SYNC_ACCOUNT,
              ERROR_OFFLINE
            ];

            if (KNOWN_ERRORS.indexOf(message.error) > -1) {
              title = message.error;
              errorMsg = message.error + '-explanation';
            }

            DialogService.alert(errorMsg, {
              title: title
            }).then(() => {
              this.showScreen(LOGGED_OUT_SCREEN);
              this.clean();
            });
          });
          break;
      }
    },

    addListener(element, event, listener) {
      if (!element || !event || !listener) {
        return;
      }
      element.addEventListener(event, this[listener]);
    },

    removeListener(element, event, listener) {
      if (!element || !event || !listener) {
        return;
      }
      element.removeEventListener(event, this[listener]);
    },

    loadElements(screen) {
      ELEMENTS.forEach(element => {
        var name = getElementName(element.selector);
        if (element.screen == screen) {
          this.elements[name] = this.panel.querySelector(element.selector);
          this.addListener(this.elements[name],
                           element.event, element.listener);
          return;
        }
        this.removeListener(this.elements[name],
                            element.event, element.listener);
        this.elements[name] = null;
      });
    },

    showScreen(screen) {
      if (this.currentScreen == screen) {
        return;
      }
      this.currentScreen = screen;
      this.screens.loggedIn.hidden = (screen != LOGGED_IN_SCREEN);
      this.screens.loggedOut.hidden = (screen != LOGGED_OUT_SCREEN);
      this.loadElements(screen);
    },

    showEnabling() {
      this.elements.login.disabled = true;
      this.elements.login.dataset.l10nId = 'fxsync-signing';
    },

    hideEnabling() {
      // It is possible that we go from enabled to syncing and viceversa.
      // In that case the login button won't be available anymore, so we
      // just bail out.
      if (!this.elements.login) {
        return;
      }
      this.elements.login.disabled = false;
      this.elements.login.dataset.l10nId = 'fxsync-get-started';
    },

    showSyncing() {
      this.elements.syncNow.dataset.l10nId = 'fxsync-syncing';
      this.disableSyncNowAndCollections(true);
    },

    maybeEnableSyncNow() {
      if (!this.elements.syncNow) {
        return;
      }
      this.elements.syncNow.disabled = (this.collections.size <= 0);
    },

    showSyncNow() {
      this.elements.syncNow.dataset.l10nId = 'fxsync-sync-now';
      this.disableSyncNowAndCollections(false);
      this.elements.unverified.hidden = true;
      this.maybeEnableSyncNow();
    },

    showUser(email) {
      this.elements.user.textContent = email;
    },

    showUnverified(email) {
      this.showUser(email);
      this.showLastSync();
      this.disableSyncNowAndCollections(true);
      this.elements.unverified.hidden = false;
    },

    showLastSync(time) {
      if (!time) {
        this.elements.lastSync.classList.add('hidden');
        return;
      }
      var formatter = mozIntl._gaia.RelativeDate(navigator.languages, {
        style: 'short'
      });
      formatter.format(time).then(relDate => {
        var selector = 'span[data-l10n-id=fxsync-last-synced]';
        var lastSync = this.elements.lastSync.querySelector(selector);
        navigator.mozL10n.setAttributes(lastSync, 'fxsync-last-synced', {
          when: relDate
        });
        this.elements.lastSync.classList.remove('hidden');
      });

      this.timeout = window.setTimeout(() => {
        this.showLastSync(time);
      }, 60 * 1000);
    },

    disableSyncNowAndCollections(disabled) {
      ['syncNow',
       'collectionsBookmarks',
       'collectionsHistory',
       'collectionsPasswords'].forEach(name => {
        this.elements[name].disabled = disabled;
      });
    },

    enable() {
      SyncManagerBridge.enable();
    },

    disable() {
      SyncManagerBridge.disable();
    },

    sync() {
      SyncManagerBridge.sync();
    },

    openTos() {
      window.open('https://accounts.firefox.com/legal/terms');
    },

    openPrivacy() {
      window.open('https://accounts.firefox.com/legal/privacy');
    }
  };

  return (panel, screens) => {
    return new FirefoxSyncPanel(panel, screens);
  };
});
