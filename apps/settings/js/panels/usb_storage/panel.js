/**
 * Used to show Storage/USB storage panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var UsbTransferModule = require('panels/usb_storage/usb_transfer');

  return function ctor_usb_storage_panel() {
    var usbTransfer = UsbTransferModule();

    return SettingsPanel({
      onInit: function() {
        usbTransfer.init();
      }
    });
  };
});
