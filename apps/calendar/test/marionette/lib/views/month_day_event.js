'use strict';

var MarionetteElement = require('./marionette_element');

/**
 * Represents a single Day Event
 */
function MonthDayEvent() {
  MarionetteElement.apply(this, arguments);
}
module.exports = MonthDayEvent;

MonthDayEvent.prototype = {
  __proto__: MarionetteElement.prototype,

  get container() {
    return this.findElement('.container');
  },

  get title() {
    return this
      .findElement('h5')
      .text();
  },

  // Marionette.Element already have a method location()
  get address() {
    return this
      .findElement('.location')
      .text();
  },

  get iconAlarm() {
    return this.findElement('.icon-alarm');
  },

  hasAlarms: function() {
    return this.element.scriptWith(function(element) {
      return element.classList.contains('has-alarms');
    });
  },

  get closestHour() {
    return +this.client.helper
      .closest(this.element, '.hour')
      .getAttribute('data-hour');
  },

  get closestAllDay() {
    return this.client.helper.closest(this.element, '.hour-allday');
  }
};
