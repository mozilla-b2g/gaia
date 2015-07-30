/* global module */
'use strict';

function System(client) {
  this.client = client;
}

module.exports = System;

System.Selector = Object.freeze({
  actionMenu: 'form[data-z-index-level="action-menu"]'
});

System.prototype = {
  client: null,

  get actionMenu() {
    // Switch to the system app first.
    this.client.switchToFrame();
    return this.client.helper.waitForElement(System.Selector.actionMenu);
  },

  switchToApp: function(appOrigin) {
    this.client.switchToFrame();
    this.client.apps.switchToApp(appOrigin);
  },

  /**
   * @return {Marionette.Element} menu option that has same text as appName.
   */
  menuOptionButton: function(appName) {
    var options = this.actionMenu.findElements('button');
    for (var i = 0; i < options.length; i++) {
      var menuOption = options[i];
      if (menuOption.text() === appName) {
        return menuOption;
      }
    }
  }
};
