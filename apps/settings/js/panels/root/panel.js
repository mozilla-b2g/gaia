define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var BatteryItem = require('panels/root/battery_item');
  var StorageUSBItem = require('panels/root/storage_usb_item');
  var StorageAppItem = require('panels/root/storage_app_item');

  return function ctor_root_panel() {
    var root = Root();
    var batteryItem;
    var storageUsbItem;
    var storageAppItem;

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
        root.init();
        batteryItem = BatteryItem(panel.querySelector('.battery-desc'));
        storageUsbItem = StorageUSBItem({
          mediaStorageDesc: panel.querySelector('.media-storage-desc'),
          umsEnabledCheckBox: panel.querySelector('.ums-switch-root'),
          umsEnabledInfoBlock: panel.querySelector('.ums-desc-root'),
          umsWarningDialog: panel.querySelector('.turn-on-ums-dialog'),
          umsConfirmButton: panel.querySelector('.ums-confirm-option'),
          umsCancelButton: panel.querySelector('.ums-cancel-option'),
          mediaStorageSection: panel.querySelector('.media-storage-section')
        });
        storageAppItem = StorageAppItem({
          appStorageDesc: panel.querySelector('.application-storage-desc')
        });
      },
      onBeforeShow: function rp_onBeforeShow() {
        batteryItem.enabled = true;
        storageUsbItem.enabled = true;
        storageAppItem.enabled = true;
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
        storageUsbItem.enabled = false;
        storageAppItem.enabled = false;
      }
    });
  };
});
