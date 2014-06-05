'use strict';

var MonthDayEvent = require('./month_day_event'),
    View = require('./view');

function MonthDay() {
  View.apply(this, arguments);
}
module.exports = MonthDay;

MonthDay.prototype = {
  __proto__: View.prototype,

  selector: '#months-day-view',

  get container() {
    return this.findElement('#event-list');
  },

  get events() {
    return this.findElements('.event').map(function(el) {
      return new MonthDayEvent(this.client, el);
    }, this);
  },

  get date() {
    return this
      .findElement('#event-list-date')
      .text();
  },

  /**
   * If event is not specified, we'll use today's first event.
   */
  scrollToEvent: function(event) {
    if (!event) {
      event = this.events[0];
    } else if (typeof event === 'number') {
      event = this.events[event];
    }

    event.scriptWith(function(element) {
      var container = document.getElementById('months-day-view');
      container.scrollTop = element.offsetTop;
    });
  }
};
