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
  'airplaneModeMenuItem': '#menuItem-airplaneMode',
  'applicationStorageDesc': '.application-storage-desc',
  'batteryDesc': '.battery-desc',
  'bluetoothDesc': '.bluetooth-desc',
  'firefoxAccountDesc': '#fxa-desc',
  'geolocationCheckbox': 'gaia-switch[name="geolocation.enabled"]',
  'languageDesc': '.language-desc',
  'mediaStorageDesc': '.media-storage-desc',
  'simManagerItem': '#simCardManager-settings',
  'simSecurityItem': '#simSecurity-settings',
  'screenLockDesc': '.screenLock-desc',
  'wifiDesc': '#wifi-desc',
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
      this.waitForElement('airplaneModeCheckbox').click();
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
    return !!this.findElement('airplaneModeCheckbox').scriptWith(function(el) {
      return el.wrappedJSObject.checked;
    });
  },

  get airplaneModeCheckboxEnabled() {
    return this.findElement('airplaneModeCheckbox').scriptWith(function(el) {
      return !el.wrappedJSObject.hasAttribute('disabled');
    });
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
      this.waitForElement('geolocationCheckbox').tap();
      this.client.waitFor(function() {
        return enabled === this.geolocationCheckboxChecked;
      }.bind(this));
    }
  },

  get geolocationCheckboxChecked() {
    return !!this.findElement('geolocationCheckbox').scriptWith(function(el) {
      return el.wrappedJSObject.checked;
    });
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
    return !!this.findElement('nfcCheckbox').scriptWith(function(el) {
      return el.wrappedJSObject.checked;
    });
  },

  // language
  isLanguageDescTranslated: function(languageKey) {
    if (!LanguagePanel.prototype._languageMap[languageKey]) {
      return false;
    }

    var expected;
    this.client.waitFor(function() {
      expected = LanguagePanel.prototype._languageMap[languageKey].desc;
      return this.languageDesc === expected;
    }.bind(this));
    return true;
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
