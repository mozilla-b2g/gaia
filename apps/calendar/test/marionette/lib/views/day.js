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
    return this.findElements('.event');
  }

};
