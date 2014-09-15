'use strict';
var Base = require('../base');

/**
 * Abstraction around settings keyboard panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function KeyboardPanel(client) {
  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, KeyboardPanel.Selectors);
}

module.exports = KeyboardPanel;

KeyboardPanel.Selectors = {
  keyboardList: '.allKeyboardList li',
  header: '#keyboard gaia-header',
  panel: '#keyboard'
};

KeyboardPanel.prototype = {

  __proto__: Base.prototype,

  get header() {
    return this.findElement('header');
  },

  tapBuiltInKeyboardItem: function() {
    this.waitForElement('keyboardList').tap();
  },

  isDialog: function() {
    var dialogAttribute =
      this.findElement('panel').getAttribute('data-dialog');
    return dialogAttribute === 'true';
  }
};
