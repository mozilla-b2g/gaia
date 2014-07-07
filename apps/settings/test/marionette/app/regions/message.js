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
  'deliveryReportMenuItem': '#menuItem-deliveryReport span',
  'deliveryReportCheckbox': '#menuItem-deliveryReport input[type="checkbox"]',
  'readReportMenuItem': '#menuItem-readReport span',
  'readReportCheckbox': '#menuItem-readReport input[type="checkbox"]',
  'wapPushMenuItem': '#menuItem-wapPush',
  'wapPushCheckbox': '#menuItem-wapPush input[type="checkbox"]',
  'cellBroadcastMenuItem': '#menuItem-cellBroadcast',
  'cellBroadcastCheckbox': '#menuItem-cellBroadcast input[type="checkbox"]',
  'retrieveSelect': 'select[name="ril.mms.retrieval_mode"]',
  'messageContentDiv': '#messaging > div'
};

MessagePanel.prototype = {
  __proto__: Base.prototype,

  settingsKeys: [
    'ril.sms.requestStatusReport.enabled',
    'ril.mms.requestReadReport.enabled',
    'wap.push.enabled',
    'ril.cellbroadcast.disabled'
  ],

  checkboxes: [
    'deliveryReportCheckbox',
    'readReportCheckbox',
    'wapPushCheckbox',
    'cellBroadcastCheckbox'
  ],

  menuItems: [
    'deliveryReportMenuItem',
    'readReportMenuItem',
    'wapPushMenuItem',
    'cellBroadcastMenuItem'
  ],

  get deliveryReportMenuItem() {
    return this.findElement('deliveryReportMenuItem');
  },

  get deliveryReportCheckbox() {
    return this.findElement('deliveryReportCheckbox');
  },

  get readReportMenuItem() {
    return this.findElement('readReportMenuItem');
  },

  get readReportCheckbox() {
    return this.findElement('readReportCheckbox');
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
