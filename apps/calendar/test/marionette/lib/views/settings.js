'use strict';

var View = require('./view');

function Settings() {
  View.apply(this, arguments);
}
module.exports = Settings;

Settings.prototype = {
  __proto__: View.prototype,

  selector: '#settings',

  createAccount: function() {
    this
      .findElement('a[href="/select-preset/"]')
      .click();
  },

  setupAdvancedSettings: function() {
    this.client
      .findElement('a[href="/advanced-settings/"]')
      .click();
  },

  sync: function() {
    this
      .findElement('[role="toolbar"] .sync')
      .click();
  }
};
