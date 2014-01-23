var Base = require('./base'),
    BluetoothPanel = require('./regions/bluetooth'),
    DoNotTrackPanel = require('./regions/do_not_track'),
    HotspotPanel = require('./regions/hotspot');
    HotspotSettingsPanel = require('./regions/hotspot_settings');
    SupportPanel = require('./regions/support');

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
  'doNotTrackMenuItem': '#menuItem-doNotTrack',
  'hotspotMenuItem': '#menuItem-internetSharing',
  'hotspotPanel': '#hotspot',
  'hotspotSettingsTrigger': '#hotspot-settings-section button',
  'supportMenuItem': '#menuItem-help'
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
  },

  get hotspotPanel() {
    openPanel.call(this, 'hotspotMenuItem');
    return this._hotspotPanel = this._hotspotPanel ||
      new HotspotPanel(this.client);
  },

  get hotspotSettingsPanel() {
    openPanel.call(this, 'hotspotSettingsTrigger', 'hotspotPanel');
    return this._hotspotSettingsPanel = this._hotspotSettingsPanel ||
      new HotspotSettingsPanel(this.client);
  },

  get supportPanel() {
    openPanel.call(this, 'supportMenuItem');
    return this._supportPanel = this._supportPanel ||
      new SupportPanel(this.client);
  }
};

/**
* @private
*/
function openPanel(selector, parentSelector) {
  parentSelector = parentSelector || 'menuItemsSection';
  menuItem = this.waitForElement(selector);
  parentSection = this.waitForElement(parentSelector);
  menuItem.tap();
  this.client.waitFor(function() {
    return parentSection.location()['x'] + parentSection.size()['width'] == 0;
  });
}
