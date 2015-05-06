'use strict';
var Base = require('./base');

// origin of the settings app
var ORIGIN = 'app://settings.gaiamobile.org';

/**
 * Abstraction around system app
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function SystemApp(client) {
  Base.call(this, client, ORIGIN, SystemApp.Selectors);
}
module.exports = SystemApp;

SystemApp.Selectors = {
  'actionMenu': 'form[data-z-index-level="action-menu"]',
  'valueSelector': '.value-selector',
  'confirmOkButton': '.appWindow.active .modal-dialog-confirm-ok'
};

SystemApp.prototype = {

  __proto__: Base.prototype,

  isActionMenuVisible: function() {
    var actionMenu = null,
        displayed = false;
    this.client.switchToFrame();
    actionMenu = this.waitForElement('actionMenu');
    displayed = actionMenu && actionMenu.displayed();
    // Go back to settings app.
    this.launch();
    return displayed;
  },

  isValueSelectorVisible: function() {
    var valueSelector = null,
        displayed = false;
    this.client.switchToFrame();
    valueSelector = this.waitForElement('valueSelector');
    displayed = valueSelector && valueSelector.displayed();
    // Go back to settings app.
    this.launch();
    return displayed;
  },

  /*
  /* Click the ok button on window.confirm dialog.
   */
  confirmOk: function() {
    this.client.switchToFrame();
    var confirmButton = this.waitForElement('confirmOkButton');
    confirmButton.click();
  }
};
