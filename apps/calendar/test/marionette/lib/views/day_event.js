'use strict';

var MarionetteElement = require('./marionette_element');

/**
 * Represents a single Day Event
 */
function DayEvent() {
  MarionetteElement.apply(this, arguments);
}
module.exports = DayEvent;

DayEvent.prototype = {
  __proto__: MarionetteElement.prototype,

  get title() {
    return this.findElement('.md__event-title');
  },

  // Marionette.Element already have a method location()
  get address() {
    return this.findElement('.md__event-location');
  },

  get iconAlarm() {
    return this.findElement('.icon-calendar-alarm');
  }
};
