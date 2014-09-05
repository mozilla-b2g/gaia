'use strict';

var View = require('./view');

function Month() {
  View.apply(this, arguments);
}
module.exports = Month;

Month.prototype = {
  __proto__: View.prototype,

  selector: '#month-view',

  get activeMonth() {
    return this.findElement('.month.active');
  },

  get currentDay() {
    return this.activeMonth.findElement('.present > .day');
  },

  get busyDots() {
    return this.activeMonth.findElements('.icon-calendar-dot');
  },

  get days() {
    return this.activeMonth.findElements('.day');
  },

  get weekdayHeaders() {
    return this
      .findElements('.month.active #month-days li')
      .map(function(li) {
        return li.text();
      });
  },

  get daySquares() {
    return this.findElements('.month.active > ol li');
  },

  get todaySquare() {
    return this.activeMonth.findElement('.present');
  },

  squareDots: function(square) {
    return square.findElements('.icon-calendar-dot');
  },

  goToNext: function() {
    this._swipe(200, 40);
  },

  goToPrev: function() {
    this._swipe(40, 200);
  },

  _swipe: function(startX, endX) {
    var previousMonth = this.activeMonth;

    this.actions
      .flick(this.activeMonth, startX, 80, endX, 80)
      .perform();

    this.client.waitFor(function() {
      return previousMonth.id !== this.activeMonth.id;
    }.bind(this));
  },

};
