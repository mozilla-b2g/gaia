'use strict';
var Base = require('../base');

/**
 * Abstraction around settings date time panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function DateTimePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, DateTimePanel.Selectors);

}

module.exports = DateTimePanel;

DateTimePanel.Selectors = {
  'timezoneRegion': '#dateTime .timezone-region'
};

DateTimePanel.prototype = {

  __proto__: Base.prototype,

  selectRegion: function(value) {
    this.tapSelectOption('timezoneRegion', value);
  }

};
