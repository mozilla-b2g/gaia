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

  get events() {
    return this.findElements('.weekday.active .event').map(function(el) {
      return new WeekEvent(this.client, el);
    }, this);
  }
};

function WeekEvent(client, element) {
  MarionetteElement.apply(this, arguments);
}

WeekEvent.prototype = {
  __proto__: MarionetteElement,

  get container() {
    return this.findElement('.container');
  }
};
