/**
 * Used to show Device/Information/More Information panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var MoreInfo = require('panels/about_more_info/more_info');

  return function ctor_support_panel() {
    var moreInfo = MoreInfo();

    return SettingsPanel({
      onInit: function(panel) {
        var elements = {
          deviceInfoMac: panel.querySelector('[data-name="deviceinfo.mac"]'),
          deviceInfoImeis: panel.querySelector('.deviceInfo-imeis'),
          deviceInfoIccIds: panel.querySelector('.deviceInfo-iccids'),
          dispDate: panel.querySelector('.gaia-commit-date'),
          dispHash: panel.querySelector('.gaia-commit-hash'),
          fields: panel.querySelectorAll('[data-name="deviceinfo.bt_address"]')
        };
        moreInfo.init(elements);
      }
    });
  };
});
