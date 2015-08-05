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

  calendars: function() {
    return this
      .findElements('.calendars .name')
      .map(function(element) {
        return element.text();
      });
  },

  toggleCalendar: function(name) {
    name = name || 'Offline calendar';
    this
      .findElements('gaia-checkbox label')
      .filter(function(element) {
        return element.text() === name;
      })[0]
      .click();
  }
};
