'use strict';
var Base = require('../base');

/**
 * Abstraction around settings do not track panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function MessagePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, MessagePanel.Selectors);
}

module.exports = MessagePanel;

MessagePanel.Selectors = {
  'requestDeliveryReportMenuItem': '#menuItem-requestDeliveryReport span',
  'requestDeliveryReportCheckbox':
    '#menuItem-requestDeliveryReport input[type="checkbox"]',
  'requestReadReportMenuItem': '#menuItem-requestReadReport span',
  'requestReadReportCheckbox':
    '#menuItem-requestReadReport input[type="checkbox"]',
  'sendReadReportMenuItem': '#menuItem-sendReadReport span',
  'sendReadReportCheckbox': '#menuItem-sendReadReport input[type="checkbox"]',
  'wapPushMenuItem': '#menuItem-wapPush',
  'wapPushCheckbox': '#menuItem-wapPush input[type="checkbox"]',
  'cellBroadcastMenuItem': '#menuItem-cellBroadcast',
  'cellBroadcastCheckbox': '#menuItem-cellBroadcast gaia-checkbox',
  'emergencyAlertMenuItem': '#menuItem-emergencyAlert',
  'emergencyAlertCheckbox': '#menuItem-emergencyAlert gaia-checkbox',
  'retrieveSelect': 'select[name="ril.mms.retrieval_mode"]',
  'messageContentDiv': '#messaging > div'
};

MessagePanel.prototype = {
  __proto__: Base.prototype,

  settingsKeys: [
    'ril.sms.requestStatusReport.enabled',
    'ril.mms.requestReadReport.enabled',
    'messages.mms.sendReadReport.enabled',
    'wap.push.enabled',
    'ril.cellbroadcast.disabled',
    'cmas.enabled'
  ],

  checkboxes: [
    'requestDeliveryReportCheckbox',
    'requestReadReportCheckbox',
    'sendReadReportCheckbox',
    'wapPushCheckbox',
    'cellBroadcastCheckbox',
    'emergencyAlertCheckbox'
  ],

  menuItems: [
    'requestDeliveryReportMenuItem',
    'requestReadReportMenuItem',
    'sendReadReportMenuItem',
    'wapPushMenuItem',
    'cellBroadcastMenuItem',
    'emergencyAlertMenuItem'
  ],

  get requestDeliveryReportMenuItem() {
    return this.findElement('requestDeliveryReportMenuItem');
  },

  get requestDeliveryReportCheckbox() {
    return this.findElement('requestDeliveryReportCheckbox');
  },

  get requestReadReportMenuItem() {
    return this.findElement('requestReadReportMenuItem');
  },

  get requestReadReportCheckbox() {
    return this.findElement('requestReadReportCheckbox');
  },

  get sendReadReportMenuItem() {
    return this.findElement('sendReadReportMenuItem');
  },

  get sendReadReportCheckbox() {
    return this.findElement('sendReadReportCheckbox');
  },

  get wapPushMenuItem() {
    return this.findElement('wapPushMenuItem');
  },

  get wapPushCheckbox() {
    return this.findElement('wapPushCheckbox');
  },

  get cellBroadcastMenuItem() {
    return this.findElement('cellBroadcastMenuItem');
  },

  get cellBroadcastCheckbox() {
    return this.findElement('cellBroadcastCheckbox');
  },

  get emergencyAlertMenuItem() {
    return this.findElement('emergencyAlertMenuItem');
  },

  get emergencyAlertCheckbox() {
    return this.findElement('emergencyAlertCheckbox');
  },

  get isEmergencyAlertCheckboxEnabled() {
    return !this.findElement('emergencyAlertCheckbox')
      .getAttribute('disabled');
  },

  get messageContentDiv() {
    return this.findElement('messageContentDiv');
  },

  chooseRetrieveMethod: function(optionText) {
    this.tapSelectOption('retrieveSelect', optionText);
  },

  getSelectedRetrieveMethod: function() {
    return this.client.settings.get('ril.mms.retrieval_mode');
  },

  initialMessagingSettings: function() {
    this._resetCheckboxes();
    this._resetSelect();
    this._scrollMessageContentToTop();
  },

  toggleMenuItem: function(menuItemName, value) {
    var checked = !!this[menuItemName + 'Checkbox'].getAttribute('checked');
    if (checked !== value) {
      this[menuItemName + 'MenuItem'].tap();
    }
  },

  isChecked: function(elementName) {
    return !!this.findElement(elementName).getAttribute('checked');
  },

  /**
   * Returns the checked status of a web component.
   * We need to execute script because the custom attribute does not
   * work in marionette.
   */
  isComponentChecked: function(elementName) {
    return !!this.findElement(elementName).scriptWith(function(el) {
      return el.wrappedJSObject.checked;
    });
  },

  _resetSelect: function() {
    this.chooseRetrieveMethod('Off');
  },

  _resetCheckboxes: function() {
    var self = this;
    this._scrollMessageContentToTop();
    this.checkboxes.forEach(function(checkbox, index) {
      var checked = !!self[checkbox].getAttribute('checked');
      if (checked) {
        var menuItemKey = self.menuItems[index];
        self[menuItemKey].tap();
      }
    });
  },

  _scrollMessageContentToTop: function() {
    // it seems that the screen will scroll to bottom sometimes
    this.messageContentDiv.scriptWith(function(el) {
      el.scrollTop = 0;
    });
  }
};
