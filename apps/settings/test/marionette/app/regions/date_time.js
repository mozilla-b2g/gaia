'use strict';
var Base = require('../base');

/**
 * Abstraction around settings datetime panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function DatetimePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, DatetimePanel.Selectors);

}

module.exports = DatetimePanel;

DatetimePanel.Selectors = {
  'clockDatePicker': '#date-picker',
  'clockTimePicker': '#time-picker',
  'clockDate': '#clock-date',
  'clockTime': '#clock-time',
  'timezoneRegion': '#timezone-region',
  'timezoneCity': '#timezone-city',
  'timezoneCityItem': '#timezone-city option'
};

DatetimePanel.prototype = {

  __proto__: Base.prototype,

  getSystemTime: function() {
    var client = this.client;
    var time;
    client.waitFor(function() {
      time = client.executeScript(function() {
        var mozTime = window.wrappedJSObject.navigator.__mozFakeTime;
        if (mozTime) {
          return mozTime;
        }
      });
      return time !== null;
    });
    return time;
  },

  setClockDate: function(time) {
    this.client.helper.fillInputField('#date-picker', time);
  },

  setClockTime: function(time) {
    this.client.helper.fillInputField('#time-picker', time);
  },

  get clockDate() {
    return this.findElement('clockDate').text();
  },

  get clockTime() {
    return this.findElement('clockTime').text();
  },

  selectRegionOption: function(region) {
    this.client.helper.tapSelectOption('#timezone-region', region);
  },

  selectCityOption: function(city) {
    this.client.helper.tapSelectOption('#timezone-city', city);
  }
};
