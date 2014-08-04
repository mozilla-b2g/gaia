'use strict';
var Base = require('../base');

/**
 * Abstraction around settings app storage panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function AppStoragePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, AppStoragePanel.Selectors);

}

function hasNumbers(t) {
  return /\d/.test(t);
}

module.exports = AppStoragePanel;

AppStoragePanel.Selectors = {
  'appTotalSpace': '.apps-total-space',
  'appUsedSpace': '.apps-used-space',
  'appFreeSpace': '.apps-free-space'
};

AppStoragePanel.prototype = {

  __proto__: Base.prototype,

  get containNumberInAppTotalSpace() {
    return hasNumbers(this.waitForElement('appTotalSpace').text());
  },

  get containNumberInAppUsedSpace() {
    return hasNumbers(this.waitForElement('appUsedSpace').text());
  },

  get containNumberInAppFreeSpace() {
    return hasNumbers(this.waitForElement('appFreeSpace').text());
  }

};
