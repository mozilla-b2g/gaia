'use strict';
var Base = require('../base');

/**
 * Abstraction around settings app permission panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function AppPermissionPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, AppPermissionPanel.Selectors);

}

module.exports = AppPermissionPanel;

AppPermissionPanel.Selectors = {
  'firstAppEntry': '.app-list a',
  'geolocationSelect': 'select[data-perm="geolocation"]'
};

AppPermissionPanel.prototype = {

  __proto__: Base.prototype,

  permissionTable: {
    'Grant': 'allow'
  },

  get georlocationSelectValue() {
    return this.findElement('geolocationSelect').getAttribute('value');
  },

  tapGeolocationSelect: function(value) {
    this.tapSelectOption('geolocationSelect', value);
  },

  enterPermissionDetail: function() {
    this.waitForElement('firstAppEntry').tap();
    this.client.waitFor(function() {
      return this.findElement('geolocationSelect');
    }.bind(this));
  }
};
