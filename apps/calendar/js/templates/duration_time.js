define(function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var DateSpan = require('templates/date_span');
var create = require('template').create;
var dateFormat = require('date_format');

var l10n = navigator.mozL10n;

module.exports = create({
  durationTime: function() {
    var format = '';
    var startDate = this.arg('startDate');
    var endDate = this.arg('endDate');
    var isAllDay = this.arg('isAllDay');

    if (isAllDay) {
      // Use the last second of previous day as the base for endDate
      // (e.g., 1991-09-14T23:59:59 insteads of 1991-09-15T00:00:00).
      endDate = new Date(endDate - 1000);
      format = Calc.isSameDate(startDate, endDate) ?
        'one-all-day-duration' :
        'multiple-all-day-duration';
    } else {
      format = Calc.isSameDate(startDate, endDate) ?
        'one-day-duration' :
        'multiple-day-duration';
    }

    return l10n.get(format, {
      startTime: formatTime(startDate),
      startDate: formatDate(startDate),
      endTime: formatTime(endDate),
      endDate: formatDate(endDate)
    });
  }
});

function formatDate(date) {
  return dateFormat.localeFormat(
    date,
    l10n.get('longDateFormat')
  );
}

function formatTime(time) {
  return DateSpan.time.render({
    time: time,
    format: 'shortTimeFormat'
  });
}

});
