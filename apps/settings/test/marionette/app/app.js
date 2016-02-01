'use strict';

var AppStoragePanel = require('./regions/app_storage');
var AppPermissionPanel = require('./regions/app_permission');
var Base = require('./base');
var BatteryPanel = require('./regions/battery');
var BluetoothPanel = require('./regions/bluetooth');
var BrowsingPrivacyPanel = require('./regions/browsing_privacy');
var DateTimePanel = require('./regions/date_time');
var DeveloperPanel = require('./regions/developer');
var DeviceInfoPanel = require('./regions/device_info');
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
var UsbStoragePanel = require('./regions/usb_storage');

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
  'appPermissionMenuItem': '#menuItem-appPermissions',
  'appStorageMenuItem': '.menuItem-applicationStorage',
  'batteryMenuItem': '.menuItem-battery',
  'bluetoothMenuItem': '#menuItem-bluetooth',
  'browsingPrivacyMenuItem': '#menuItem-browsingPrivacy',
  'dateTimeMenuItem': '#menuItem-dateAndTime',
  'developerMenuItem': '#menuItem-developer',
  'deviceInfoMenuItem': '#menuItem-deviceInfo',
  'displayMenuItem': '#menuItem-display',
  'doNotTrackMenuItem': '#menuItem-doNotTrack',
  'feedbackMenuItem': 'a[href="#improveBrowserOS-chooseFeedback"]',
  'hotspotMenuItem': '#menuItem-internetSharing',
  'hotspotPanel': '#hotspot',
  'hotspotSettingsTrigger': '#hotspot-settings-section button',
  'improveMenuItem': '#menuItem-improveBrowserOS',
  'improveSection': '#improveBrowserOS',
  'keyboardMenuItem': '#menuItem-keyboard',
  'languageMenuItem': '.menuItem-languageAndRegion',
  'mediaStorageMenuItem': '.menuItem-mediaStorage',
  'messageMenuItem': '#menuItem-messagingSettings',
  'notificationsMenuItem': '#menuItem-notifications',
  'screenLockMenuItem': '#menuItem-screenLock',
  'soundMenuItem': '#menuItem-sound',
  'supportMenuItem': '#menuItem-help',
  'usbStorageMenuItem': '.menuItem-enableStorage'
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

  get browsingPrivacyPanel() {
    this.openPanel('browsingPrivacyMenuItem');
    this._browsingPrivacyPanel = this._browsingPrivacyPanel ||
      new BrowsingPrivacyPanel(this.client);
    return this._browsingPrivacyPanel;
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
    this.openPanel.call(this, 'improveMenuItem');
    this._improvePanel = this._improvePanel ||
      new ImprovePanel(this.client);
    return this._improvePanel;
  },

  get feedbackPanel() {
    this.openPanel.call(this, 'feedbackMenuItem', 'improveSection');
    this._feedbackPanel =
      this._feedbackPanel || new FeedbackPanel(this.client);
    return this._feedbackPanel;
  },

  get appPermissionPanel() {
    this.openPanel.call(this, 'appPermissionMenuItem');
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

  get developerPanel() {
    this.openPanel('developerMenuItem');
    this._developerPanel = this._developerPanel ||
      new DeveloperPanel(this.client);
    return this._developerPanel;
  },

  get usbStoragePanel() {
    this.openPanel('usbStorageMenuItem');
    this._usbStoragePanel = this._usbStoragePanel ||
      new UsbStoragePanel(this.client);
    return this._usbStoragePanel;
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

    menuItem.scriptWith(function(el) {
      el.scrollIntoView(false);
    });
    menuItem.tap();
    this.client.waitFor(function() {
      var loc = parentSection.location();
      var size = parentSection.size();
      return Math.abs(loc.x) === size.width;
    });
  }
};
