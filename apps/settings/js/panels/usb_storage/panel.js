/**
 * Used to show Storage/USB storage panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var UsbTransferModule = require('panels/usb_storage/usb_transfer');
  var LazyLoader = require('shared/lazy_loader');
  var elements = {};

  return function ctor_usb_storage_panel() {
    var usbTransfer = UsbTransferModule();

    return SettingsPanel({
      onInit: function us_onInit(panel) {
        elements = {
          usbEnabledCheckBox: panel.querySelector('.ums-switch'),
          usbEnabledInfoBlock: panel.querySelector('.ums-switch-desc'),
          protocols: panel.querySelectorAll('gaia-radio')
        };

        // decide if possible to hot switch Usb Transfer Protocol according to
        // device-features.json
        LazyLoader.getJSON('/resources/device-features.json')
        .then(({usbHotProtocolSwitch}) => usbTransfer.init(elements, {
          usbHotProtocolSwitch: usbHotProtocolSwitch
        }));
      }
    });
  };
});
