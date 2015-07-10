'use strict';
var Base = require('../base');

/**
 * Abstraction around settings notification panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function NotificationsPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, NotificationsPanel.Selectors);

}

module.exports = NotificationsPanel;

NotificationsPanel.Selectors = {
  'showOnLockScreenCheckbox': '#notifications gaia-checkbox'
};

NotificationsPanel.prototype = {

  __proto__: Base.prototype,

  get isShowOnLockScreenEnabled() {
    return this.findElement('showOnLockScreenCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('lockscreen.notifications-preview.enabled');
  },

  tapOnShowOnLockScreen: function() {
    this.waitForElement('showOnLockScreenCheckbox').click();
  }

};
