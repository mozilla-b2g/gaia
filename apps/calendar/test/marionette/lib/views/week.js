'use strict';

var View = require('./view');

function Week() {
  View.apply(this, arguments);
}
module.exports = Week;

Week.prototype = {
  __proto__: View.prototype,

  selector: '#week-view',

  get events() {
    return this.findElements('.weekday.active .event');
  }
};
