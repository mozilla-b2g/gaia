define(function(require, exports, module) {
'use strict';

var MultiDay = require('./multi_day');

require('dom!day-view');

function DayView(opts) {
  MultiDay.apply(this, arguments);
}
module.exports = DayView;

DayView.prototype = {
  __proto__: MultiDay.prototype,

  scale: 'day',
  visibleCells: 1,

  get element() {
    return document.getElementById('day-view');
  }
};

});
