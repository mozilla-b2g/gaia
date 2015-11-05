/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* exports FirefoxSyncToolbar */

/* global LazyLoader */
/* global Settings */
/* global SyncManagerBridge */

'use strict';

/**
 * This small module handles the logic of the Sync entry in the browser's
 * top right toolbar menu.
 *
 * We show two different variations of the UI depending on the state of Sync:
 *
 * - When Sync is disabled, we show a 'Sign in to Sync' entry. Clicking it
 *   triggers the Firefox Accounts flow and signs the user into Sync if the
 *   FxA flow is completed successfuly.
 * - When Sync is enabled, we show the 'Sign is as {{email}}' entry. Where
 *   {{email}} is the email used by the user to login into FxA.
 *
 * We also handle a third Sync state. When an error is received through the
 * Sync Manager Bridge, we inform the user about them. The expected errors are:
 *
 * - ERROR_OFFLINE: The user is trying to log in Sync when the device is
 *   offline.
 * - ERROR_INVALID_SYNC_ACCOUNT: The user is trying to log into Sync with a
 *   Firefox Account that has never been used before with Sync. On the first
 *   version we don't support the creation of new Sync accounts, so we ask the
 *   user to first login in Firefox Desktop or Android and try login again
 *   in the TV.
 * - ERROR_TRY_LATER: The server is probably down. We inform the user about it
 *   and ask her to retry in a few minutes.
 * - ERROR_UNKNOWN: We don't know what the h* was wrong, but we can't log the
 *   user in.
 *
 *   Here we don't need to worry about keeping any kind of state or managing
 *   any state transistion apart from the UI changes. The Sync State Machine
 *   and Sync State Manager takes care of handling all that for us.
 */

(function(exports) {
  const DEBUG = true;
  function debug() {
    if (DEBUG) {
      console.log('[FirefoxSyncToolbar] ' + Array.slice(arguments).concat());
    }
  }

  var FirefoxSyncToolbar = {
    init() {
      SyncManagerBridge.addListener(this.onsyncchange.bind(this));

      this.syncBlock = document.getElementById('fxsync-block');
      this.syncTab = this.syncBlock.querySelector('#fxsync-tab');

      document.addEventListener('visibilitychange', () => {
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
          if (this.showListener) {
            this.syncBlock.removeEventListener('mouseup', this.showListener);
            this.showListener = null;
          }
          this.syncBlock.addEventListener('mouseup', SyncManagerBridge.enable);
          this.syncTab.setAttribute('data-l10n-id', 'fxsync-sign-in-to-sync');
          this.syncTab.removeAttribute('data-l10n-args');
          break;
        case 'enabling':
          this.syncTab.setAttribute('data-l10n-id', 'fxsync-signing');
          break;
        case 'syncing':
        case 'enabled':
          this.showListener = Settings.show.bind(Settings);
          this.syncBlock.addEventListener('mouseup', this.showListener);
          this.syncBlock.removeEventListener('mouseup',
                                             SyncManagerBridge.enable);
          navigator.mozL10n.setAttributes(this.syncTab, 'fxsync-signed-in-as', {
            email: message.user
          });
          break;
      }
    }
  };

  // Exported only for testing purposes
  exports.FirefoxSyncToolbar = FirefoxSyncToolbar;

  LazyLoader.load('js/sync/manager_bridge.js', () => {
    FirefoxSyncToolbar.init();
  });

}(window));
