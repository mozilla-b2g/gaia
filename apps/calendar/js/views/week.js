Calendar.ns('Views').Week = (function() {
'use strict';

var Calc = Calendar.Calc;
var MultiDay = Calendar.Views.MultiDay;

function WeekView(opts) {
  MultiDay.apply(this, arguments);
}

WeekView.prototype = {
  __proto__: MultiDay.prototype,

  scale: 'week',
  visibleCells: 5,

  get element() {
    return document.getElementById('week-view');
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

return WeekView;
}());
