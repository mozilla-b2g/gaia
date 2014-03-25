'use strict';

var View = require('./view');

function Month() {
  View.apply(this, arguments);
}
module.exports = Month;

Month.prototype = {
  __proto__: View.prototype,

  selector: '#month-view'
};
