'use strict';

var View = require('./view'),
    MarionetteElement = require('./marionette_element');

function Week() {
  View.apply(this, arguments);
}
module.exports = Week;

Week.prototype = {
  __proto__: View.prototype,

  selector: '#week-view',

  get activeFrame() {
    return this.findElement('.weekday.active');
  },

  get events() {
    return this.activeFrame.findElements('.event').map(function(el) {
      return new WeekEvent(this.client, el);
    }, this);
  },

  get todayDates() {
    return this.activeFrame.findElements('.sticky-frame > h1.is-today');
  },

  get currentTime() {
    return this.activeFrame.findElement('.current-time');
  },

  get currentHour() {
    var now = new Date();
    return this.activeFrame.findElement('.hour-'+ now.getHours());
  },

  get currentDisplayHour() {
    return this.currentHour.findElement('.display-hour');
  }
};

function WeekEvent(client, element) {
  MarionetteElement.apply(this, arguments);
}

WeekEvent.prototype = {
  __proto__: MarionetteElement.prototype,

  get container() {
    return this.findElement('.container');
  }
};
