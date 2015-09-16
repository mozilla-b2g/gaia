/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsUtils = require('modules/settings_utils');
  var FirefoxSyncPanel =
    require('panels/firefox_sync/firefox_sync');

  return () => {
    return SettingsPanel({
      onInit: function fxsync_onInit(panel) {
        // We only query the high level screen elements here.
        // Each screen has specific elements associated and we lazy load
        // these elements depending on the screen that we need to show to
        // the user according to the state of Sync.
        var screens = {
          loggedIn: panel.querySelector('.fxsync-logged-in'),
          loggedOut: panel.querySelector('.fxsync-logged-out')
        };

        this.syncPanel = FirefoxSyncPanel(panel, screens);
        var header = panel.querySelector('gaia-header');
        SettingsUtils.runHeaderFontFit(header);
      },

      onShow: function fxsync_onShow() {
        this.syncPanel.refresh();
      },

      onHide: function fxsync_onHide() {
        this.syncPanel.clean();
      }
    });
  };
});
