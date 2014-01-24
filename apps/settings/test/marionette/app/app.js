var Base = require('./base'),
    BluetoothPanel = require('./regions/bluetooth'),
    DoNotTrackPanel = require('./regions/do_not_track'),
    HotspotPanel = require('./regions/hotspot');
    HotspotSettingsPanel = require('./regions/hotspot_settings');
    SupportPanel = require('./regions/support');
    BatteryPanel = require('./regions/battery');

// origin of the settings app
const ORIGIN = 'app://settings.gaiamobile.org';

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

Settings.Selectors = {
  'menuItemsSection': '#root',
  'bluetoothMenuItem': '#menuItem-bluetooth',
  'doNotTrackMenuItem': '#menuItem-doNotTrack',
  'hotspotMenuItem': '#menuItem-internetSharing',
  'hotspotPanel': '#hotspot',
  'hotspotSettingsTrigger': '#hotspot-settings-section button',
  'supportMenuItem': '#menuItem-help',
  'batteryMenuItem': '#menuItem-battery'
};

Settings.prototype = {

  __proto__: Base.prototype,

  get bluetoothPanel() {
    openPanel.call(this, 'bluetoothMenuItem');
    this._bluetoothPanel = this._bluetoothPanel ||
      new BluetoothPanel(this.client);
    return this._bluetoothPanel;
  },

  get doNotTrackPanel() {
    openPanel.call(this, 'doNotTrackMenuItem');
    this._doNotTrackPanel = this._doNotTrackPanel ||
      new DoNotTrackPanel(this.client);
    return this._doNotTrackPanel;
  },

  get hotspotPanel() {
    openPanel.call(this, 'hotspotMenuItem');
    this._hotspotPanel = this._hotspotPanel ||
      new HotspotPanel(this.client);
    return this._hotspotPanel;
  },

  get hotspotSettingsPanel() {
    openPanel.call(this, 'hotspotSettingsTrigger', 'hotspotPanel');
    this._hotspotSettingsPanel = this._hotspotSettingsPanel ||
      new HotspotSettingsPanel(this.client);
    return this._hotspotSettingsPanel;
  },

  get supportPanel() {
    openPanel.call(this, 'supportMenuItem');
    this._supportPanel = this._supportPanel ||
      new SupportPanel(this.client);
    return this._supportPanel;
  },

  get batteryPanel() {
    openPanel.call(this, 'batteryMenuItem');
    this._batteryPanel = this._batteryPanel ||
      new BatteryPanel(this.client);
    return this._batteryPanel;
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
    return parentSection.location()['x'] + parentSection.size()['width'] === 0;
  });
}
