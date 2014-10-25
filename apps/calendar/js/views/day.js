define(function(require, exports, module) {
'use strict';

var MultiDay = require('./multi_day');
var Calc = require('calc');

require('dom!day-view');

function DayView(opts) {
  MultiDay.apply(this, arguments);
}
module.exports = DayView;

DayView.prototype = {
  __proto__: MultiDay.prototype,

  scale: 'day',
  visibleCells: 1,
  _previousMonthDay: null,

  get element() {
    return document.getElementById('day-view');
  },

  isThereNeedToSwipe: function() {
    var needToSwipe = true;
    if (this._previousMonthDay &&
        Calc.isSameDate(this.timeController.day, this._previousMonthDay)) {
      needToSwipe = false;
    }
    this._previousMonthDay = this.timeController.day;
    return needToSwipe;
  },

  _onDayChange: function() {
    MultiDay.prototype._onDayChange.apply(this, arguments);
    this._previousMonthDay = this.timeController.day;
  }
};

});
