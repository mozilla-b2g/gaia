'use strict';
var Base = require('../base');
var LanguagePanel = require('./language');

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
  'airplaneModeCheckbox': '.airplaneMode-input',
  'airplaneModeSpan': '.airplaneMode-input ~ span',
  'applicationStorageDesc': '.application-storage-desc',
  'batteryDesc': '.battery-desc',
  'bluetoothDesc': '.bluetooth-desc',
  'firefoxAccountDesc': '#fxa-desc',
  'geolocationSwitch': 'gaia-switch[name="geolocation.enabled"]',
  'languageDesc': '.language-desc',
  'mediaStorageDesc': '.media-storage-desc',
  'simManagerItem': '#simCardManager-settings',
  'simSecurityItem': '#simSecurity-settings',
  'screenLockDesc': '.screenLock-desc',
  'wifiDesc': '#wifi-desc',
  'usbStorageCheckbox': '.usb-switch',
  'usbStorageSpan': '.usb-switch ~ span',
  'usbStorageDesc': '.usb-desc',
  'usbStorageConfirmDialog': '.turn-on-ums-dialog',
  'usbStorageConfirmButton': '.ums-confirm-option',
  'nfcCheckbox': '#nfc-input'
};

RootPanel.prototype = {

  __proto__: Base.prototype,

  // application storage
  get applicationStorageDesc() {
    return this.waitForElement('applicationStorageDesc').text();
  },

  // airplane mode
  airplaneMode: function(enabled) {
    var self = this;

    this.client.waitFor(function() {
      return self.airplaneModeCheckboxEnabled;
    });

    if (enabled !== this.airplaneModeCheckboxChecked) {
      this.waitForElement('airplaneModeSpan').tap();
      this.client.waitFor(function() {
        return enabled === self.airplaneModeCheckboxChecked;
      });
    }

    // make sure we would wait for two more status here
    if (enabled === true) {
      this.client.waitFor(function() {
        return self.WiFiDesc === 'Disabled';
      });
      this.client.waitFor(function() {
        return self.bluetoothDesc === 'Turned off';
      });
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
      this.waitForElement('geolocationSwitch').tap();
      this.client.waitFor(function() {
        return enabled === this.geolocationCheckboxChecked;
      }.bind(this));
    }
  },

  get geolocationCheckboxChecked() {
    return !!this.findElement('geolocationSwitch').getAttribute('checked');
  },

  get geolocationEnabledSetting() {
    return this.client.settings.get('geolocation.enabled');
  },

  get wifiEnabledSetting() {
    return this.client.settings.get('wifi.enabled');
  },

  get bluetoothEnabledSetting() {
    return this.client.settings.get('bluetooth.enabled');
  },

  get nfcCheckboxChecked() {
    return !!this.findElement('nfcCheckbox').getAttribute('checked');
  },

  // language
  isLanguageDescTranslated: function(languageKey) {
    if (!LanguagePanel.prototype._languageMap[languageKey]) {
      return false;
    }

    var expected = LanguagePanel.prototype._languageMap[languageKey].desc;
    return this.languageDesc === expected;
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
