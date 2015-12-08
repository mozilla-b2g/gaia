'use strict';
var Base = require('../base');

/**
 * Abstraction around settings bluetooth panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function BluetoothPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, BluetoothPanel.Selectors);

}

module.exports = BluetoothPanel;

BluetoothPanel.Selectors = {
  'bluetoothEnabledCheckbox': '.bluetooth-status gaia-switch'
};

BluetoothPanel.prototype = {

  __proto__: Base.prototype,

  get isBluetoothEnabled() {
    return this.findElement('bluetoothEnabledCheckbox')
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  enableBluetooth: function() {
    this.waitForElement('bluetoothEnabledCheckbox').tap();
      this.client.waitFor(function() {
        return this.isBluetoothEnabled;
    }.bind(this));
  },

  disableBluetooth: function() {
    this.waitForElement('bluetoothEnabledCheckbox').tap();
      this.client.waitFor(function() {
        return !this.isBluetoothEnabled;
    }.bind(this));
  }

};
