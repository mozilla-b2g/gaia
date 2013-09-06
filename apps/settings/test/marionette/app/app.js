var Base = require('./base'),
    BluetoothPanel = require('./regions/bluetooth'),
    DoNotTrackPanel = require('./regions/do_not_track');

/**
 * Abstraction around settings app
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Settings(client) {
  this.client = client;
  // Call the Base constructor to initiate base class.
  Base.call(this, this.client, ORIGIN, Settings.Selectors);
}

module.exports = Settings;

// origin of the settings app
const ORIGIN = 'app://settings.gaiamobile.org';

Settings.Selectors = {
  'menuItemsSection': '#root',
  'bluetoothMenuItem': '#menuItem-bluetooth',
  'doNotTrackMenuItem': '#menuItem-doNotTrack'
};

Settings.prototype = {

  __proto__: Base.prototype,

  get bluetoothPanel() {
    openPanel.call(this, 'bluetoothMenuItem');
    return this._bluetoothPanel = this._bluetoothPanel ||
      new BluetoothPanel(this.client);
  },

  get doNotTrackPanel() {
    openPanel.call(this, 'doNotTrackMenuItem');
    return this._doNotTrackPanel = this._doNotTrackPanel ||
      new DoNotTrackPanel(this.client);
  }

};

/**
* @private
*/
function openPanel(selector) {
  menuItem = this.waitForElement(selector);
  parentSection = this.waitForElement('menuItemsSection');
  menuItem.tap();
  this.client.waitFor(function() {
    return parentSection.location()['x'] + parentSection.size()['width'] == 0;
  });
}
