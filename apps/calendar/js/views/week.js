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
  _addAmPmClass: true,
  _previousStartDate: null,

  get element() {
    return document.getElementById('week-view');
  },

  isThereNeedToSwipe: function() {
    var needToSwipe = true;
    var currentStartDate = new Date(this._currentTime.timespan.start);
    console.log('currentStartDate: ' + currentStartDate);
    console.log('_previousStartDate: ' + this._previousStartDate);
    if (this._previousStartDate &&
        Calc.isSameDate(currentStartDate, this._previousStartDate)) {
      needToSwipe = false;
    }
    this._previousStartDate = currentStartDate;
    return needToSwipe;
  },

  _onDayChange: function() {
    MultiDay.prototype._onDayChange.apply(this, arguments);
    this._previousStartDate = new Date(this._currentTime.timespan.start);
  },

  _calcBaseDate: function(date) {
    // show monday as the first day of the grid if date is between Mon-Fri
    var index = Calc.dayOfWeekFromMonday(date.getDay());
    if (index < 5) {
      date = Calc.createDay(date, date.getDate() -index);
    }
    return date;
  }
};

});
