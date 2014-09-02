'use strict';

var Base = require('../base');

/**
 * Abstraction around settings device information panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function DeviceInformationPanel(client) {
  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, DeviceInformationPanel.Selectors);
}


module.exports = DeviceInformationPanel;

DeviceInformationPanel.Selectors = {
  'deviceInformationPanel': '#about',
  'backButton': '#about > header a',
};

DeviceInformationPanel.prototype = {

  __proto__: Base.prototype,

  isRendered: function() {
    this.client.waitFor(function() {
      return this.waitForElement('deviceInformationPanel')
              .getAttribute('data-rendered') === 'true';
    }.bind(this));
  },

  goBack: function() {
    this.waitForElement('backButton').tap();
  }
};

