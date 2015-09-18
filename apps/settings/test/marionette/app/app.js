'use strict';

var AppStoragePanel = require('./regions/app_storage');
var AppPermissionPanel = require('./regions/app_permission');
var Base = require('./base');
var BatteryPanel = require('./regions/battery');
var BluetoothPanel = require('./regions/bluetooth');
var DateTimePanel = require('./regions/date_time');
var DisplayPanel = require('./regions/display');
var DoNotTrackPanel = require('./regions/do_not_track');
var FeedbackPanel = require('./regions/feedback');
var HotspotPanel = require('./regions/hotspot');
var HotspotSettingsPanel = require('./regions/hotspot_settings');
var ImprovePanel = require('./regions/improve');
var KeyboardPanel = require('./regions/keyboard');
var LanguagePanel = require('./regions/language');
var MediaStoragePanel = require('./regions/media_storage');
var MessagePanel = require('./regions/message');
var NotificationsPanel = require('./regions/notifications');
var RootPanel = require('./regions/root');
var ScreenLockPanel = require('./regions/screen_lock');
var SoundPanel = require('./regions/sound');
var SupportPanel = require('./regions/support');
var DeviceInfoPanel = require('./regions/device_info');
var BrowsingPrivacyPanel = require('./regions/browsing_privacy');

/**
 * Abstraction around settings app
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Settings(client) {
  this.client = client;
  // Call the Base constructor to initiate base class.
  Base.call(this, this.client, Settings.ORIGIN, Settings.Selectors);
}

// origin of the settings app
Settings.ORIGIN = 'app://settings.gaiamobile.org';

module.exports = Settings;

Settings.Selectors = {
  'menuItemsSection': '#root',
  'bluetoothMenuItem': '.menuItem-bluetooth',
  'doNotTrackMenuItem': '#menuItem-doNotTrack',
  'hotspotMenuItem': '#menuItem-internetSharing',
  'hotspotPanel': '#hotspot',
  'hotspotSettingsTrigger': '#hotspot-settings-section button',
  'supportMenuItem': '#menuItem-help',
  'batteryMenuItem': '.menuItem-battery',
  'dateTimeMenuItem': '#menuItem-dateAndTime',
  'notificationsMenuItem': '#menuItem-notifications',
  'improvePanel': '#menuItem-improveBrowserOS',
  'improveSection': '#improveBrowserOS',
  'feedbackPanel': 'a[href="#improveBrowserOS-chooseFeedback"]',
  'soundMenuItem': '#menuItem-sound',
  'languageMenuItem': '.menuItem-languageAndRegion',
  'screenLockMenuItem': '#menuItem-screenLock',
  'appPermissionPanel': '#menuItem-appPermissions',
  'displayMenuItem': '#menuItem-display',
  'appStorageMenuItem': '.menuItem-applicationStorage',
  'mediaStorageMenuItem': '.menuItem-mediaStorage',
  'keyboardMenuItem': '#menuItem-keyboard',
  'messageMenuItem': '#menuItem-messagingSettings',
  'deviceInfoMenuItem': '#menuItem-deviceInfo',
  'browsingPrivacyMenuItem': '#menuItem-browsingPrivacy'
};

Settings.prototype = {

  __proto__: Base.prototype,

  get rootPanel() {
    this._rootPanel = this._rootPanel ||
      new RootPanel(this.client);
    return this._rootPanel;
  },

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

  get dateTimePanel() {
    this.openPanel('dateTimeMenuItem');
    this._dateTimePanel = this._dateTimePanel ||
      new DateTimePanel(this.client);
    return this._dateTimePanel;
  },

  get notificationsPanel() {
    this.openPanel('notificationsMenuItem');
    this._notificationsPanel = this._notificationsPanel ||
      new NotificationsPanel(this.client);
    return this._notificationsPanel;
  },

  get soundPanel() {
    this.openPanel('soundMenuItem');
    this._soundPanel = this._soundPanel ||
      new SoundPanel(this.client);
    return this._soundPanel;
  },

  get languagePanel() {
    this.openPanel('languageMenuItem');
    this._languagePanel = this._languagePanel ||
      new LanguagePanel(this.client);
    return this._languagePanel;
  },

  get screenLockPanel() {
    this.openPanel('screenLockMenuItem');
    this._screenLockPanel = this._screenLockPanel ||
      new ScreenLockPanel(this.client);
    return this._screenLockPanel;
  },

  get displayPanel() {
    this.openPanel.call(this, 'displayMenuItem');
    this._displayPanel = this._displayPanel ||
      new DisplayPanel(this.client);
    return this._displayPanel;
  },

  get improvePanel() {
    this.openPanel.call(this, 'improvePanel');
    this._improvePanel = this._improvePanel ||
      new ImprovePanel(this.client);
    return this._improvePanel;
  },

  get feedbackPanel() {
    this.openPanel.call(this, 'feedbackPanel', 'improveSection');
    this._feedbackPanel =
      this._feedbackPanel || new FeedbackPanel(this.client);
    return this._feedbackPanel;
  },

  get appPermissionPanel() {
    this.openPanel.call(this, 'appPermissionPanel');
    this._appPermissionPanel =
      this._appPermissionPanel || new AppPermissionPanel(this.client);
    return this._appPermissionPanel;
  },

  get appStoragePanel() {
    this.openPanel.call(this, 'appStorageMenuItem');
    this._appStoragePanel =
      this._appStoragePanel || new AppStoragePanel(this.client);
    return this._appStoragePanel;
  },

  get mediaStoragePanel() {
    this.openPanel('mediaStorageMenuItem');
    this._mediaStoragePanel = this._mediaStoragePanel ||
      new MediaStoragePanel(this.client);
    return this._mediaStoragePanel;
  },

  get keyboardPanel() {
    this.openPanel('keyboardMenuItem');
    this._keyboardPanel = this._keyboardPanel || new KeyboardPanel(this.client);
    return this._keyboardPanel;
  },

  get messagePanel() {
    this.openPanel('messageMenuItem');
    this._messagePanel = this._messagePanel || new MessagePanel(this.client);
    return this._messagePanel;
  },

  get aboutPanel() {
    this.openPanel('deviceInfoMenuItem');
    this._aboutPanel = this._aboutPanel ||
      new DeviceInfoPanel(this.client);
    return this._aboutPanel;
  },

  get browsingPrivacyPanel() {
    this.openPanel('browsingPrivacyMenuItem');
    this._browsingPrivacyPanel = this._browsingPrivacyPanel ||
      new BrowsingPrivacyPanel(this.client);
    return this._browsingPrivacyPanel;
  },

  set currentLanguage(value) {
    // open the language panel
    var languagePanel = this.languagePanel;
    languagePanel.currentLanguage = value;
    languagePanel.back();
  },

  /**
   * @private
   */
  openPanel: function app_openPanel(selector, parentSelector) {
    var localParentSelector = parentSelector || 'menuItemsSection';
    var menuItem = this.waitForElement(selector);
    var parentSection = this.waitForElement(localParentSelector);

    // make sure it is enabled first
    this.client.waitFor(function() {
      return this.findElement('messageMenuItem').enabled();
    }.bind(this));

    menuItem.tap();
    this.client.waitFor(function() {
      var loc = parentSection.location();
      var size = parentSection.size();
      return Math.abs(loc.x) === size.width;
    });
  }
};
