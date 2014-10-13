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
  var ScreenLockItem = require('panels/root/screen_lock_item');
  var SimSecurityItem = require('panels/root/sim_security_item');
  var AirplaneModeItem = require('panels/root/airplane_mode_item');
  var ThemesItem = require('panels/root/themes_item');
  var PrivacyPanelItem = require('panels/root/privacy_panel_item');

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
    var screenLockItem;
    var simSecurityItem;
    var airplaneModeItem;
    var themesItem;
    var privacyPanelItem;

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
        screenLockItem =
          ScreenLockItem(panel.querySelector('.screenLock-desc'));
        airplaneModeItem =
          AirplaneModeItem(panel.querySelector('.airplaneMode-input'));
        simSecurityItem =
          SimSecurityItem(panel.querySelector('.simCardLock-desc'));
        themesItem =
          ThemesItem(panel.querySelector('.themes-section'));
        privacyPanelItem =
          PrivacyPanelItem(panel.querySelector('#privacyPanel-settings'));
      },
      onBeforeShow: function rp_onBeforeShow() {
        bluetoothItem.enabled = true;
        languageItem.enabled = true;
        batteryItem.enabled = true;
        findMyDeviceItem.enabled = true;
        storageUsbItem.enabled = true;
        storageAppItem.enabled = true;
        wifiItem.enabled = true;
        screenLockItem.enabled = true;
        simSecurityItem.enabled = true;
        airplaneModeItem.enabled = true;
        themesItem.enabled = true;
      },
      onHide: function rp_onHide() {
        bluetoothItem.enabled = false;
        languageItem.enabled = false;
        batteryItem.enabled = false;
        findMyDeviceItem.enabled = false;
        storageUsbItem.enabled = false;
        storageAppItem.enabled = false;
        wifiItem.enabled = false;
        screenLockItem.enabled = false;
        simSecurityItem.enabled = false;
        airplaneModeItem.enabled = false;
        themesItem.enabled = false;
      }
    });
  };
});
