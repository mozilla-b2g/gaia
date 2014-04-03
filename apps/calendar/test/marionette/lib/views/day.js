'use strict';

var View = require('./view');

function Day() {
  View.apply(this, arguments);
}
module.exports = Day;

Day.prototype = {
  __proto__: View.prototype,

  selector: '#day-view',

  get events() {
    // FIXME: use a very specific selector because of Bug 988079
    return this.findElements('section[data-date].active .event');
  }

};
