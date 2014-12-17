/**
 * Used to show Device/Information panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HardwareInfo = require('panels/about/hardware_info');
  var UpdateCheck = require('panels/about/update_check');
  var FactoryReset = require('panels/about/factory_reset');

  return function ctor_support_panel() {
    var hardwareInfo = HardwareInfo();
    var factoryReset = FactoryReset();
    var updateCheck = UpdateCheck();

    return SettingsPanel({
      onInit: function(panel) {
        hardwareInfo.init({
          deviceInfoPhoneNum: panel.querySelector('.deviceinfo-phone-num'),
          deviceInfoMsisdns: panel.querySelector('.deviceInfo-msisdns')
        });

        updateCheck.init({
          checkUpdateNow: panel.querySelector('.check-update-now'),
          lastUpdateDate: panel.querySelector('.last-update-date'),
          updateStatus: panel.querySelector('.update-status'),
          systemStatus: panel.querySelector('.system-update-status')
        });

        factoryReset.init({
          resetButton: panel.querySelector('.reset-phone'),
          resetDialog: panel.querySelector('.reset-phone-dialog'),
          resetConfirm: panel.querySelector('.confirm-reset-phone'),
          resetCancel: panel.querySelector('.cancel-reset-phone')
        });
      }
    });
  };
});
