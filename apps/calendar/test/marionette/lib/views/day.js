'use strict';

var WeekView = require('./week'),
    DayEvent = require('./day_event');

function Day() {
  WeekView.apply(this, arguments);
}
module.exports = Day;

Day.prototype = {
  __proto__: WeekView.prototype,

  selector: '#day-view',

  get activeDay() {
    return this.findElement('.md__day[aria-hidden="false"]');
  },

  get events() {
    return this.activeDay.findElements('.md__event').map(function(el) {
      return new DayEvent(this.client, el);
    }, this);
  }
};
