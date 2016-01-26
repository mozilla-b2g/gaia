/**
 * This module contains modules for the low priority items in the root panel.
 * The module should only be loaded after the menu items are ready for user
 * interaction.
 *
 * @module views/phone/root/low_priority_items
 */
define(function(require) {
  'use strict';

  var items = {
    BluetoothItem: require('views/phone/root/bluetooth_item'),
    NFCItem: require('views/phone/root/nfc_item'),
    LanguageItem: require('views/phone/root/language_item'),
    BatteryItem: require('views/phone/root/battery_item'),
    FindMyDeviceItem: require('views/phone/root/findmydevice_item'),
    StorageUSBItem: require('views/phone/root/storage_usb_item'),
    StorageAppItem: require('views/phone/root/storage_app_item'),
    WifiItem: require('views/phone/root/wifi_item'),
    ScreenLockItem: require('views/phone/root/screen_lock_item'),
    SimSecurityItem: require('views/phone/root/sim_security_item')
  };

  return {
    get BluetoothItem()    { return items.BluetoothItem; },
    get NFCItem()          { return items.NFCItem; },
    get LanguageItem()     { return items.LanguageItem; },
    get BatteryItem()      { return items.BatteryItem; },
    get FindMyDeviceItem() { return items.FindMyDeviceItem; },
    get StorageUSBItem()   { return items.StorageUSBItem; },
    get StorageAppItem()   { return items.StorageAppItem; },
    get WifiItem()         { return items.WifiItem; },
    get ScreenLockItem()   { return items.ScreenLockItem; },
    get SimSecurityItem()  { return items.SimSecurityItem; }
  };
});
