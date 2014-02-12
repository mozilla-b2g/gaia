'use strict';
var Base = require('./base'),
    BluetoothPanel = require('./regions/bluetooth'),
    DoNotTrackPanel = require('./regions/do_not_track'),
    HotspotPanel = require('./regions/hotspot'),
    HotspotSettingsPanel = require('./regions/hotspot_settings'),
    SupportPanel = require('./regions/support'),
    BatteryPanel = require('./regions/battery'),
    NotificationsPanel = require('./regions/notifications');

// origin of the settings app
var ORIGIN = 'app://settings.gaiamobile.org';

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
  'batteryMenuItem': '#menuItem-battery',
  'notificationsMenuItem': '#menuItem-notifications'
};

Settings.prototype = {

  __proto__: Base.prototype,

  get bluetoothPanel() {
    this.openPanel('bluetoothMenuItem');
    this._bluetoothPanel = this._bluetoothPanel ||
      new BluetoothPanel(this.client);
    return this._bluetoothPanel;
  },

  get doNotTrackPanel() {
    this.openPanel('doNotTrackMenuItem');
    this._doNotTrackPanel = this._doNotTrackPanel ||
      new DoNotTrackPanel(this.client);
    return this._doNotTrackPanel;
  },

  get hotspotPanel() {
    this.openPanel('hotspotMenuItem');
    this._hotspotPanel = this._hotspotPanel ||
      new HotspotPanel(this.client);
    return this._hotspotPanel;
  },

  get hotspotSettingsPanel() {
    this.openPanel('hotspotSettingsTrigger', 'hotspotPanel');
    this._hotspotSettingsPanel = this._hotspotSettingsPanel ||
      new HotspotSettingsPanel(this.client);
    return this._hotspotSettingsPanel;
  },

  get supportPanel() {
    this.openPanel('supportMenuItem');
    this._supportPanel = this._supportPanel ||
      new SupportPanel(this.client);
    return this._supportPanel;
  },

  get batteryPanel() {
    this.openPanel('batteryMenuItem');
    this._batteryPanel = this._batteryPanel ||
      new BatteryPanel(this.client);
    return this._batteryPanel;
  },

  get notificationsPanel() {
    this.openPanel('notificationsMenuItem');
    this._notificationsPanel = this._notificationsPanel ||
      new NotificationsPanel(this.client);
    return this._notificationsPanel;
  },

  /**
   * @private
   */
  openPanel: function app_openPanel(selector, parentSelector) {
    var localParentSelector = parentSelector || 'menuItemsSection';
    var menuItem = this.waitForElement(selector);
    var parentSection = this.waitForElement(localParentSelector);
    menuItem.tap();
    this.client.waitFor(function() {
      var loc = parentSection.location();
      var size = parentSection.size();
      return (loc.x + size.width) === 0;
    });
  }
};
