define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var BatteryItem = require('panels/root/battery_item');
  var StorageUSB = require('panels/root/storage_usb');
  var StorageApp = require('panels/root/storage_app');

  return function ctor_root_panel() {
    var root = Root();
    var batteryItem;

    var storage_usb = StorageUSB();
    var storage_app = StorageApp();

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
        var storage_elements = {
          appStorageDesc: panel.querySelector('.application-storage-desc'),
          mediaStorageDesc: panel.querySelector('.media-storage-desc'),
          umsEnabledCheckBox: panel.querySelector('.ums-switch-root'),
          umsEnabledInfoBlock: panel.querySelector('.ums-desc-root'),
          umsWarningDialog: panel.querySelector('.turn-on-ums-dialog'),
          umsConfirmButton: panel.querySelector('.ums-confirm-option'),
          umsCancelButton: panel.querySelector('.ums-cancel-option'),
          mediaStorageSection: panel.querySelector('.media-storage-section')
        };

        root.init();
        storage_usb.init(storage_elements);
        storage_app.init(storage_elements);
        batteryItem = BatteryItem(panel.querySelector('.battery-desc'));
      },
      onBeforeShow: function rp_onBeforeShow() {
        batteryItem.enabled = true;
        storage_usb.enabled = true;
        storage_app.enabled = true;
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
        storage_usb.enabled = false;
        storage_app.enabled = false;
      }
    });
  };
});
