/**
 * Used to show Device/Information/More Information panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var CommitInfo = require('panels/about_more_info/commit_info');
  var HardwareInfo = require('panels/about_more_info/hardware_info');
  var DeviceInfo = require('panels/about_more_info/device_info');

  return function ctor_support_panel() {
    var commitInfo = CommitInfo();
    var hardwareInfo = HardwareInfo();
    var deviceInfo = DeviceInfo();

    return SettingsPanel({
      onInit: function(panel) {
        deviceInfo.init({
          listImeis: panel.querySelector('.list-imeis'),
          listIccIds: panel.querySelector('.list-iccids'),
          deviceInfoImeis: panel.querySelector('.deviceInfo-imeis'),
          deviceInfoIccIds: panel.querySelector('.deviceInfo-iccids')
        });

        commitInfo.init({
          dispDate: panel.querySelector('.gaia-commit-date'),
          dispHash: panel.querySelector('.gaia-commit-hash')
        });

        hardwareInfo.init({
          deviceInfoMac: panel.querySelector('[data-name="deviceinfo.mac"]'),
          btAddr: panel.querySelector('[data-name="deviceinfo.bt_address"]')
        });
      }
    });
  };
});
