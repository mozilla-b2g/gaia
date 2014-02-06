'use strict';

var View = require('./view');

function Day() {
  View.apply(this, arguments);
}
module.exports = Day;

Day.prototype = {
  __proto__: View.prototype,

  selector: '#day-view',

  get activeDay() {
    return this.findElement('section[data-date].active');
  },

  get events() {
    // FIXME: use a very specific selector because of Bug 988079
    return this.activeDay.findElements('.event');
  },

  get allDayIcon() {
    return this.activeDay.findElement('.hour-allday .icon-allday');
  }

};
