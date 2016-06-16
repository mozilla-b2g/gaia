'use strict';
var Base = require('../base');

/**
 * Abstraction around settings developer panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function DeveloperPanel(client) {
  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, DeveloperPanel.Selectors);
}


module.exports = DeveloperPanel;

DeveloperPanel.Selectors = {
  'DeveloperPanel': '#developer'
};

DeveloperPanel.prototype = {

  __proto__: Base.prototype,

  get isDeveloperMenuItemVisible() {
    return this.findElement('developerMenuItem').displayed();
  }

};
