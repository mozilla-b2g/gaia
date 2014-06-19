define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var NFCItem = require('panels/root/nfc_item');
  var BatteryItem = require('panels/root/battery_item');

  return function ctor_root_panel() {
    var root = Root();
    var nfcItem;
    var batteryItem;

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
        root.init();
        nfcItem = NFCItem(panel.querySelector('.nfc-settings'));
        batteryItem = BatteryItem(panel.querySelector('.battery-desc'));
      },
      onBeforeShow: function rp_onBeforeShow() {
        batteryItem.enabled = true;
      },
      onShow: function rp_onShow() {
        // XXX: Set data-ready to true to indicate that the first panel is
        //      displayed and we are ready to use animations for the later panel
        //      transitions. This should be moved to startup.js after we handle
        //      inline activities there.
        document.body.dataset.ready = true;
      },
      onHide: function rp_onHide() {
        batteryItem.enabled = false;
      }
    });
  };
});
