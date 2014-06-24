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
    return this.activeMonth.findElements('.icon-dot');
  },

  get days() {
    return this.findElements('.day');
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
    return this.findElement('.month.active .present');
  },

  squareDots: function(square) {
    return square.findElements('.icon-dot');
  }
};
