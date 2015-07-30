define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var DialogPanel = require('modules/dialog_panel');

  return function ctor_full_dev_panel() {
    return DialogPanel({
      onInit: function(panel) {
        this._panel = panel;

        this._devMenuEnabled = false;
        this._fullDevModeWarning =
          panel.querySelector('.full-dev-mode-warning');
        this._enableDevMenuWarning =
          panel.querySelector('.dev-menu-disabled-warning');
      },
      onBeforeShow: function(panel) {
        return new Promise((resolve) => {
          SettingsCache.getSettings((results) => {
            this._devMenuEnabled = !!results['developer.menu.enabled'];
            if (this._devMenuEnabled) {
              this._showFullDevModeWarning();
            } else {
              this._showEnableDevMenuWarning();
            }
            resolve();
          });
        });
      },
      onHide: function() {
        this._fullDevModeWarning.hidden = true;
        this._enableDevMenuWarning.hidden = true;
        [].slice.call(this._panel.querySelectorAll('button')).forEach((btn) => {
          btn.removeAttribute('type');
        });
      },
      onSubmit: function() {
        if (this._devMenuEnabled) {
          return Promise.resolve('final_warning');
        }
      },
      _showFullDevModeWarning: function() {
        var warningDialog = this._fullDevModeWarning;
        var enableBtn = warningDialog.querySelector('button.enable-btn');
        var cancelBtn = warningDialog.querySelector('button.cancel-btn');

        enableBtn.setAttribute('type', 'submit');
        cancelBtn.setAttribute('type', 'reset');
        warningDialog.hidden = false;        
      },
      _showEnableDevMenuWarning: function() {
        var warningDialog = this._enableDevMenuWarning;
        var closeBtn = warningDialog.querySelector('button.close-btn');

        closeBtn.setAttribute('type', 'submit');
        warningDialog.hidden = false;
      }
    });
  };
});
