define(function(require, exports, module) {
'use strict';

var Calc = require('calc');
var MultiDay = require('./multi_day');

require('dom!week-view');

function WeekView(opts) {
  MultiDay.apply(this, arguments);
}
module.exports = WeekView;

WeekView.prototype = {
  __proto__: MultiDay.prototype,

  scale: 'week',
  visibleCells: 5,
  _hourFormat: 'week-hour-format',
  _oneDayLabelFormat: 'week-event-one-day-duration',
  _addAmPmClass: true,

  get element() {
    return document.getElementById('week-view');
  },

  _calcBaseDate: function(date) {
    // Don't reset the first day when come back from other screens.
    if (this.baseDate && Calc.isSameDate(date, this.baseDate)) {
      return this.baseDate;
    }

    // Show monday as the first day of the grid if date is between Mon-Fri.
    var index = Calc.dayOfWeekFromMonday(date.getDay());
    if (index < 5) {
      date = Calc.createDay(date, date.getDate() - index);
    }
    return date;
  }
};

});
