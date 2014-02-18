'use strict';

var View = require('./view');

function Settings() {
  View.apply(this, arguments);
}
module.exports = Settings;

Settings.prototype = {
  __proto__: View.prototype,

  selector: '#settings',

  setupAdvancedSettings: function() {
    this.client
      .findElement('button.settings')
      .click();
  },

  sync: function() {
    this
      .findElement('[role="toolbar"] .sync')
      .click();
  },

  toggleCalendar: function(name) {
    name = name || 'Offline calendar';
    this
      .findElements('.calendars > li')
      .filter(function(el) {
        return el.findElement('.name').text() === name;
      })[0]
      .findElement('.pack-checkbox').click();
  }
};
