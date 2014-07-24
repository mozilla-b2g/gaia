'use strict';

var View = require('./view'),
    DayEvent = require('./day_event');

function Day() {
  View.apply(this, arguments);
}
module.exports = Day;

Day.prototype = {
  __proto__: View.prototype,

  selector: '#day-view',

  get activeDay() {
    // FIXME: use a very specific selector because of Bug 988079
    return this.findElement('section[data-date].active');
  },

  get events() {
    return this.activeDay.findElements('.event').map(function(el) {
      return new DayEvent(this.client, el);
    }, this);
  },

  get allDayIcon() {
    return this.activeDay.findElement('.hour-allday .icon-calendar-allday');
  },

  get currentTime() {
    return this.activeDay.findElement('.current-time');
  },

  get currentHour() {
    var now = new Date();
    return this.activeDay.findElement('.hour-'+ now.getHours());
  },

  get currentDisplayHour() {
    return this.currentHour.findElement('.display-hour');
  },

  get allDay() {
    return this.activeDay.findElement('.hour-allday');
  }
};
