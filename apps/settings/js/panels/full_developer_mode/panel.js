define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var SettingsCache = require('modules/settings_cache');
  var DialogService = require('modules/dialog_service');
  var Panel = require('modules/panel');

  /**
   * The panel can be invoked by triggering an activity:
   * new MozActivity({
   *   name: 'configure',
   *   data: {
   *     target: 'device',
   *     section: 'full-developer-mode'
   *   }
   * })
   */
  return function ctor_full_dev_panel() {
    return Panel({
      onInit: function(panel) {
        this._panel = panel;
        SettingsCache.getSettings((results) => {
          var devMenuEnabled = !!results['developer.menu.enabled'];
          if (devMenuEnabled) {
            this._showFullDevModeWarning();
          } else {
            this._showEnableDevMenuWarning();
          }
        });
      },
      _close: function() {
        SettingsService.back();
      },
      _showFullDevModeWarning: function() {
        var warningDialog = this._panel.querySelector('.full-dev-mode-warning');
        var okBtn = warningDialog.querySelector('button[type="submit"]');
        var cancelBtn = warningDialog.querySelector('button[type="reset"]');

        warningDialog.hidden = false;
        cancelBtn.onclick = this._close;
        okBtn.onclick = () => {
          DialogService.show('full-developer-mode-final-warning').then(() => {
            this._close();
          });
        };
      },
      _showEnableDevMenuWarning: function() {
        var warningDialog =
          this._panel.querySelector('.dev-menu-disabled-warning');
        var closeBtn = warningDialog.querySelector('button[type="submit"]');

        warningDialog.hidden = false;
        closeBtn.onclick = this._close;
      }
    });
  };
});
