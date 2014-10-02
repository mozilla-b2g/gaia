(function(window) {
  'use strict';

  var _ = navigator.mozL10n.get;
  var DateSpan = Calendar.Templates.DateSpan;

  var DurationTime = Calendar.Template.create({
    durationTime: function() {
      var format = '';
      var startDate = this.arg('startDate');
      var endDate = this.arg('endDate');
      var isAllDay = this.arg('isAllDay');

      if (isAllDay) {
        // Use the last second of previous day as the base for endDate
        // (e.g., 1991-09-14T23:59:59 insteads of 1991-09-15T00:00:00).
        endDate = new Date(endDate - 1000);
        format = Calendar.Calc.isSameDate(startDate, endDate) ?
          'one-all-day-duration' :
          'multiple-all-day-duration';
      } else {
        format = Calendar.Calc.isSameDate(startDate, endDate) ?
          'one-day-duration' :
          'multiple-day-duration';
      }

      return _(format, {
        startTime: formatTime(startDate),
        startDate: formatDate(startDate),
        endTime: formatTime(endDate),
        endDate: formatDate(endDate)
      });
    }
  });

  function formatDate(date) {
    return Calendar.App.dateFormat.localeFormat(
      date,
      _('longDateFormat')
    );
  }

  function formatTime(time) {
    return DateSpan.time.render({
      time: time,
      format: 'shortTimeFormat'
    });
  }

  Calendar.ns('Templates').DurationTime = DurationTime;
}(this));
