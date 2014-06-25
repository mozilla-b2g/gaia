define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var NFCItem = require('panels/root/nfc_item');
  var LanguageItem = require('panels/root/language_item');
  var BatteryItem = require('panels/root/battery_item');
  var FindMyDeviceItem = require('panels/root/findmydevice_item');

  return function ctor_root_panel() {
    var root = Root();
    var nfcItem;
    var languageItem;
    var batteryItem;
    var findMyDeviceItem;

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
        root.init();
        nfcItem = NFCItem(panel.querySelector('.nfc-settings'));
        languageItem = LanguageItem(panel.querySelector('.language-desc'));
        batteryItem = BatteryItem(panel.querySelector('.battery-desc'));
        findMyDeviceItem = FindMyDeviceItem(
          panel.querySelector('.findmydevice-desc'));
      },
      onBeforeShow: function rp_onBeforeShow() {
        languageItem.enabled = true;
        batteryItem.enabled = true;
        findMyDeviceItem.enabled = true;
      },
      onShow: function rp_onShow() {
        // XXX: Set data-ready to true to indicate that the first panel is
        //      displayed and we are ready to use animations for the later panel
        //      transitions. This should be moved to startup.js after we handle
        //      inline activities there.
        document.body.dataset.ready = true;
      },
      onHide: function rp_onHide() {
        languageItem.enabled = false;
        batteryItem.enabled = false;
        findMyDeviceItem.enabled = false;
      }
    });
  };
});
