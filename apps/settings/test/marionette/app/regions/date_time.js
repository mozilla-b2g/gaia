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
  'timezoneRegion': '#dateTime .timezone-region',
  'timezoneInfoText': '#dateTime .timezone-info-text',
  'timeFormatSelect': '#dateTime .time-format-time'
};

DateTimePanel.prototype = {

  __proto__: Base.prototype,

  selectRegion: function(value) {
    this.tapSelectOption('timezoneRegion', value);
  },

  selectTimeFormat: function(value) {
    this.tapSelectOption('timeFormatSelect', value);
  },

  get timezoneInfoText() {
    return this.waitForElement('timezoneInfoText').text();
  }

};
