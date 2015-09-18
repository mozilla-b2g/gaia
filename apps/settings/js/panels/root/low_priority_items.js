/**
 * This module contains modules for the low priority items in the root panel.
 * The module should only be loaded after the menu items are ready for user
 * interaction.
 *
 * @module panels/root/low_priority_items
 */
define(function(require) {
  'use strict';

  var items = {
    BluetoothItem: require('panels/root/bluetooth_item'),
    NFCItem: require('panels/root/nfc_item'),
    LanguageItem: require('panels/root/language_item'),
    BatteryItem: require('panels/root/battery_item'),
    FindMyDeviceItem: require('panels/root/findmydevice_item'),
    StorageUSBItem: require('panels/root/storage_usb_item'),
    StorageMediaItem: require('panels/root/storage_media_item'),
    StorageAppItem: require('panels/root/storage_app_item'),
    WifiItem: require('panels/root/wifi_item'),
    ScreenLockItem: require('panels/root/screen_lock_item'),
    SimSecurityItem: require('panels/root/sim_security_item')
  };

  return {
    get BluetoothItem()    { return items.BluetoothItem; },
    get NFCItem()          { return items.NFCItem; },
    get LanguageItem()     { return items.LanguageItem; },
    get BatteryItem()      { return items.BatteryItem; },
    get FindMyDeviceItem() { return items.FindMyDeviceItem; },
    get StorageUSBItem()   { return items.StorageUSBItem; },
    get StorageMediaItem() { return items.StorageMediaItem; },
    get StorageAppItem()   { return items.StorageAppItem; },
    get WifiItem()         { return items.WifiItem; },
    get ScreenLockItem()   { return items.ScreenLockItem; },
    get SimSecurityItem()  { return items.SimSecurityItem; }
  };
});
