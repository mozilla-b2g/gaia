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

  get sideBarHours() {
    return this.dayEventsWrapper.findElements('.hour .display-hour');
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
  },

  get dayEventsWrapper() {
    return this.activeDay.findElement('.day-events-wrapper');
  },

  set scrollTop(scrollTop) {
    this.dayEventsWrapper.scriptWith(function(el, scrollTop) {
      el.scrollTop = scrollTop;
    }, [scrollTop]);
  },

  get scrollTop() {
    return this.dayEventsWrapper.scriptWith(function(el) {
      return el.scrollTop;
    });
  },

  waitForDisplay: function() {
    this.client.waitFor(this.displayed.bind(this));
    this._waitForScrollEnd();
  },

  _waitForScrollEnd: function() {
    // Wait for the end of the animated scrolling.
    // In UX spec, the scroller always scrolls to
    // previous hour of current time in the today day view.
    // In other days, it scrolls to 8AM.
    this.client.waitFor(function() {
      if (this.scrollTop ===
            this.getDistinationScrollTop(new Date().getHours() - 1) ||
          this.scrollTop ===
            this.getDistinationScrollTop(8)
        ) {
        return true;
      }
    }.bind(this));
  },

  getDistinationScrollTop: function(hour) {
    var scrollHeight = this.dayEventsWrapper.scriptWith(function(el) {
      return el.scrollHeight;
    });
    var clientHeight = this.dayEventsWrapper.scriptWith(function(el) {
      return el.clientHeight;
    });

    var bottomScrollTop = scrollHeight - clientHeight;
    var hourOffsetTop = this.dayEventsWrapper.scriptWith(function(el, hour) {
      return el.querySelector('.hour-' + hour).offsetTop;
    }, [hour]);
    return Math.min(hourOffsetTop, bottomScrollTop);
  }
};
