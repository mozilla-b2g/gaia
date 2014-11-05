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
  'appListItem': '.app-list a',
  'geolocationSelect': 'select[data-perm="geolocation"]',
  'uninstallButton': '#uninstall-app'
};

AppPermissionPanel.prototype = {

  __proto__: Base.prototype,

  permissionTable: {
    'Grant': 'allow'
  },

  get georlocationSelectValue() {
    return this.findElement('geolocationSelect').getAttribute('value');
  },

  get appList() {
    return this.findElements('appListItem');
  },

  get uninstallButton() {
    return this.waitForElement('uninstallButton');
  },

  tapGeolocationSelect: function(value) {
    this.tapSelectOption('geolocationSelect', value);
  },

  enterPermissionDetail: function() {
    var entry = this.waitForElement('appListItem');
    entry.tap();
    this.client.waitFor(function() {
      return this.findElement('geolocationSelect');
    }.bind(this));
  }
};
