define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var BluetoothItem = require('panels/root/bluetooth_item');
  var NFCItem = require('panels/root/nfc_item');
  var LanguageItem = require('panels/root/language_item');
  var BatteryItem = require('panels/root/battery_item');
  var FindMyDeviceItem = require('panels/root/findmydevice_item');
  var StorageUSBItem = require('panels/root/storage_usb_item');
  var StorageAppItem = require('panels/root/storage_app_item');
  var WifiItem = require('panels/root/wifi_item');

  return function ctor_root_panel() {
    var root = Root();
    var bluetoothItem;
    var nfcItem;
    var languageItem;
    var batteryItem;
    var findMyDeviceItem;
    var storageUsbItem;
    var storageAppItem;
    var wifiItem;

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
        root.init();
        bluetoothItem = BluetoothItem(panel.querySelector('.bluetooth-desc'));
        nfcItem = NFCItem(panel.querySelector('.nfc-settings'));
        languageItem = LanguageItem(panel.querySelector('.language-desc'));
        batteryItem = BatteryItem(panel.querySelector('.battery-desc'));
        findMyDeviceItem = FindMyDeviceItem(
          panel.querySelector('.findmydevice-desc'));
        storageUsbItem = StorageUSBItem({
          mediaStorageDesc: panel.querySelector('.media-storage-desc'),
          usbEnabledCheckBox: panel.querySelector('.usb-switch'),
          usbStorage: panel.querySelector('#menuItem-enableStorage'),
          usbEnabledInfoBlock: panel.querySelector('.usb-desc'),
          umsWarningDialog: panel.querySelector('.turn-on-ums-dialog'),
          umsConfirmButton: panel.querySelector('.ums-confirm-option'),
          umsCancelButton: panel.querySelector('.ums-cancel-option'),
          mediaStorageSection: panel.querySelector('.media-storage-section')
        });
        storageAppItem = StorageAppItem(
          panel.querySelector('.application-storage-desc'));
        wifiItem = WifiItem(panel.querySelector('#wifi-desc'));
      },
      onBeforeShow: function rp_onBeforeShow() {
        bluetoothItem.enabled = true;
        languageItem.enabled = true;
        batteryItem.enabled = true;
        findMyDeviceItem.enabled = true;
        storageUsbItem.enabled = true;
        storageAppItem.enabled = true;
        wifiItem.enabled = true;
      },
      onShow: function rp_onShow() {
        // XXX: Set data-ready to true to indicate that the first panel is
        //      displayed and we are ready to use animations for the later panel
        //      transitions. This should be moved to startup.js after we handle
        //      inline activities there.
        document.body.dataset.ready = true;
      },
      onHide: function rp_onHide() {
        bluetoothItem.enabled = false;
        languageItem.enabled = false;
        batteryItem.enabled = false;
        findMyDeviceItem.enabled = false;
        storageUsbItem.enabled = false;
        storageAppItem.enabled = false;
        wifiItem.enabled = false;
      }
    });
  };
});
