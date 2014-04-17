'use strict';

var View = require('./view');

function Month() {
  View.apply(this, arguments);
}
module.exports = Month;

Month.prototype = {
  __proto__: View.prototype,

  selector: '#month-view',

  get currentDay() {
    return this.findElement('.month.active .present > .day');
  },

  get days() {
    return this.findElements('.day');
  }
};
