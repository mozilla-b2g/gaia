'use strict';
var Base = require('../base');

/**
 * Abstraction around settings root panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function RootPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, RootPanel.Selectors);

}

module.exports = RootPanel;

RootPanel.Selectors = {
  'airplaneModeCheckbox': '#airplaneMode-input',
  'airplaneModeSpan': '#airplaneMode-input ~ span',
  'applicationStorageDesc': '#application-storage-desc',
  'batteryDesc': '.battery-desc',
  'bluetoothDesc': '#bluetooth-desc',
  'firefoxAccountDesc': '#fxa-desc',
  'geolocationCheckbox': '#root input[name="geolocation.enabled"]',
  'geolocationSpan': '#root input[name="geolocation.enabled"] ~ span',
  'languageDesc': '#language-desc',
  'mediaStorageDesc': '#media-storage-desc',
  'simManagerItem': '#simCardManager-settings',
  'simSecurityItem': '#simSecurity-settings',
  'screenLockDesc': '#screenLock-desc',
  'wifiDesc': '#wifi-desc',
  'usbStorageCheckbox': '#ums-switch-root',
  'usbStorageSpan': '#ums-switch-root ~ span',
  'usbStorageDesc': '#ums-desc-root',
  'usbStorageConfirmDialog': '#turn-on-ums-dialog',
  'usbStorageConfirmButton': '#ums-confirm-option'
};

RootPanel.prototype = {

  __proto__: Base.prototype,

  _languageMap: {
    english: {
      desc: 'English (US)',
    },
    traditionalChinese: {
      desc: '正體中文',
    },
    french: {
      desc: 'Français',
    }
  },

  // application storage
  get applicationStorageDesc() {
    return this.waitForElement('applicationStorageDesc').text();
  },

  // airplane mode
  airplaneMode: function(enabled) {
    this.client.waitFor(function() {
      return this.airplaneModeCheckboxEnabled;
    }.bind(this));
    if (enabled !== this.airplaneModeCheckboxChecked) {
      this.waitForElement('airplaneModeSpan').tap();
      this.client.waitFor(function() {
        return enabled === this.airplaneModeCheckboxChecked;
      }.bind(this));
    }
  },

  get airplaneModeCheckboxChecked() {
    return !!this.findElement('airplaneModeCheckbox').getAttribute('checked');
  },

  get airplaneModeCheckboxEnabled() {
    return this.findElement('airplaneModeCheckbox').enabled();
  },

  // battery
  get batteryDesc() {
    return this.waitForElement('batteryDesc').text();
  },

  // bluetooth
  get bluetoothDesc() {
    return this.waitForElement('bluetoothDesc').text();
  },

  // firefox account
  get firefoxAccountDesc() {
    return this.waitForElement('firefoxAccountDesc').text();
  },

  // geolocation
  geolocation: function(enabled) {
    if (enabled !== this.geolocationCheckboxChecked) {
      this.waitForElement('geolocationSpan').tap();
      this.client.waitFor(function() {
        return enabled === this.geolocationCheckboxChecked;
      }.bind(this));
    }
  },

  get geolocationCheckboxChecked() {
    return !!this.findElement('geolocationCheckbox').getAttribute('checked');
  },

  get geolocationEnabledSetting() {
    return this.client.settings.get('geolocation.enabled');
  },

  // language
  isLanguageDescTranslated: function(languageKey) {
    if (this._languageMap[languageKey]) {
      var desc = this._languageMap[languageKey].desc;
      if (this.languageDesc === desc) {
        return true;
      }
    }
    return false;
  },

  get languageDesc() {
    return this.findElement('languageDesc').text();
  },

  // media storage
  get mediaStorageDesc() {
    return this.waitForElement('mediaStorageDesc').text();
  },

  // screen lock
  get screenLockDesc() {
    return this.waitForElement('screenLockDesc').text();
  },

  // usb storage
  usbStorage: function(enabled) {
    if (enabled !== this.usbStorageCheckboxChecked) {
      this.waitForElement('usbStorageSpan').tap();
      this.client.waitFor(function() {
        return enabled === this.usbStorageCheckboxChecked;
      }.bind(this));
    }
  },

  tapUsbStorageConfirmButton: function() {
    this.waitForElement('usbStorageConfirmButton').tap();
  },

  get usbStorageCheckboxChecked() {
    return !!this.findElement('usbStorageCheckbox').getAttribute('checked');
  },

  get usbStorageDesc() {
    return this.findElement('usbStorageDesc').text();
  },

  // wifi
  get WiFiDesc() {
    return this.waitForElement('wifiDesc').text();
  },

  // sim manager
  get isSimManagerItemVisible() {
    return this.findElement('simManagerItem').displayed();
  },

  get isSimSecurityItemVisible() {
    return this.findElement('simSecurityItem').displayed();
  }

};
