'use strict';

var View = require('./view');

function AdvancedSettings() {
  View.apply(this, arguments);
}
module.exports = AdvancedSettings;

AdvancedSettings.prototype = {
  __proto__: View.prototype,

  selector: '#advanced-settings-view',

  createAccount: function() {
    this
      .findElement('[href="/select-preset/"]')
      .click();
  }
};
