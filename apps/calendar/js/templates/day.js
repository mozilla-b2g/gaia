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
        this.h('classes')
      ].join(' ');

      return '<section class="' + classes + '" data-hour="' + hour + '">' +
          '<div class="hour-header">' +
            (isAllDay ? '<i class="gaia-icon icon-calendar-allday"></i>' : '') +
            '<span ' + l10n + 'class="display-hour">' +
              displayHour +
            '</span>' +
          '</div>' +
          // we add a wrapper to allday events to improve the scroll
          // performance and avoid glitches
          (isAllDay ? '<div class="allday-events-wrapper">' : '') +
            '<div class="events">' + this.s('items') + '</div>' +
          (isAllDay ? '</div>' : '') +
        '</section>';
    },

    attendee: function() {
      return '<span class="attendee">' + this.h('value') + '</span>';
    },

    event: function() {
      var calendarId = this.h('calendarId');
      var hasAlarm = this.arg('hasAlarm');

      var eventClassName = [
        'event',
        'calendar-id-' + calendarId,
        'calendar-bg-color',
        this.h('classes')
      ].join(' ');

      var containerClassName = 'container calendar-border-color ' +
        'calendar-id-' + calendarId;

      var alarm = '';

      if (hasAlarm) {
        containerClassName += ' has-alarm';
        alarm = '<i class="gaia-icon icon-calendar-alarm ' +
          'calendar-text-color"></i>';
      }

      return '<section class="' + eventClassName + '" ' +
        'data-id="' + this.h('busytimeId') + '">' +
          '<div class="' + containerClassName + '">' +
            '<div class="event-title">' + this.h('title') + '</div>' +
            '<span class="event-location">' +
              this.h('location') +
            '</span>' +
          '</div>' +
          alarm +
        '</section>';
    }
  });

  Day.eventSelector = '.event';
  Day.hourEventsSelector = '.events';

  Calendar.ns('Templates').Day = Day;
}(this));
