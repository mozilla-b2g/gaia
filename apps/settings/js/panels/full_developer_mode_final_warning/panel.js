define(function(require) {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');

  return function ctor_full_dev_warning() {
    return DialogPanel({
      onInit: function(panel) {
        this._warningDialog = {
          root: panel.querySelector('.warning-dialog'),
          okBtn: panel.querySelector('.warning-dialog button[type="submit"]'),
          cancelBtn:
            panel.querySelector('.warning-dialog button[type="reset"]'),
          warningInfo: panel.querySelector('.warning-dialog .warning-info')
        };
      },
      onBeforeShow: function() {
        this._count = 10;
        this._updateWarningInfo(this._count);
      },
      onSubmit: function() {
        if (this._count === 1) {
          this._wipe().catch(() => {
            this.close();
          });
          return Promise.reject();
        } else {
          this._count--;
          this._updateWarningInfo(this._count);
          return Promise.reject();
        }
      },
      _updateWarningInfo: function(count) {
        window.navigator.mozL10n.setAttributes(this._warningDialog.warningInfo,
          'enable-full-dev-mode-final-warning-msg', {
            count: count
          });
      },
      _wipe: function() {
        var power = navigator.mozPower;
        if (!power) {
          console.error('Cannot get mozPower');
          return Promise.reject();
        }
        if (!power.factoryReset) {
          console.error('Cannot invoke mozPower.factoryReset()');
          return Promise.reject();
        }
        power.factoryReset('root');
        return Promise.resolve();
      }
    });
  };
});
