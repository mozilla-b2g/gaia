/*globals Calendar*/
(function(window) {
  'use strict';

  var Day = Calendar.Template.create({
    hour: function() {
      var hour = this.h('hour');
      var l10n = '';
      var displayHour;
      var isAllDay = hour === Calendar.Calc.ALLDAY;

      if (isAllDay) {
        l10n = ' data-l10n-id="hour-allday" ';
        displayHour = navigator.mozL10n.get('hour-allday');
      } else {
        displayHour = this.h('displayHour');
      }

      var classes = [
        'hour',
        'hour-' + hour,
        this.h('classes'),
        'calendar-display'
      ].join(' ');

      return '<section class="' + classes + '" data-hour="' + hour + '">' +
          '<h4>' +
            (isAllDay ? '<i class="icon-allday"></i>' : '') +
            '<span ' + l10n + 'class="display-hour ' + hour + '">' +
              displayHour +
            '</span>' +
          '</h4>' +
          /** has no semantic value - re-evaluate */
          '<div class="events">' + this.s('items') + '</div>' +
        '</section>';
    },

    attendee: function() {
      return '<span class="attendee">' + this.h('value') + '</span>';
    },

    event: function() {
      var calendarId = this.h('calendarId');
      var hasAlarm = this.arg('hasAlarm');

      var eventClassName = 'event calendar-id-' + calendarId +
        ' calendar-display calendar-bg-color ' +
        this.h('classes');

      var containerClassName = 'container calendar-border-color ' +
        'calendar-id-' + calendarId;

      if (hasAlarm) {
        containerClassName += ' has-alarm';
      }

      return '<section class="' + eventClassName + '" ' +
        'data-id="' + this.h('busytimeId') + '">' +
          '<div class="' + containerClassName + '">' +
            '<h5>' + this.h('title') + '</h5>' +
            '<span class="location">' +
              this.h('location') +
            '</span>' +
          '</div>' +
          (hasAlarm ? '<i class="icon-alarm calendar-text-color"></i>' : '') +
        '</section>';
    }
  });

  Day.eventSelector = '.event';
  Day.hourEventsSelector = '.events';

  Calendar.ns('Templates').Day = Day;
}(this));
