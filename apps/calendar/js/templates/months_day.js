(function(window) {
  'use strict';

  var DateSpan = Calendar.Templates.DateSpan;

  var MonthsDay = Calendar.Template.create({
    event: function() {
      var calendarId = this.h('calendarId');

      var sectionClassList = [
        'event',
        'calendar-id-' + calendarId,
        this.h('classes')
      ].join(' ');

      var containerClassList = [
        'container',
        'calendar-id-' + calendarId
      ].join(' ');

      this.eventTime = function() {
        if (this.arg('isAllDay')) {
          return '<div class="all-day" data-l10n-id="hour-allday"></div>';
        }
        var startTime = formatTime(this.arg('startTime'));
        var endTime = formatTime(this.arg('endTime'));
        return `<div class="start-time">${startTime}</div>
                <div class="end-time">${endTime}</div>`;
      };

      this.eventDetails = function() {
        var result = '<h5>' + this.h('title') + '</h5>';
        var location = this.h('location');
        if (location && location.length > 0) {
          result += '<span class="details">';
          result += '<span class="location">';
          result += location;
          result += '</span>';
          result += '</span>';
        }

        return result;
      };

      return '<section class="' + sectionClassList + '" ' +
                      'data-id="' + this.h('busytimeId') + '">' +
             '<div class="' + containerClassList + '">' +
               '<div class="gaia-icon icon-calendar-dot calendar-text-color">' +
               '</div>' +
               '<div class="event-time">' + this.eventTime() + '</div>' +
               '<div class="event-details">' + this.eventDetails() + '</div>' +
               '<div class="gaia-icon icon-calendar-alarm ' +
                 'calendar-text-color"></div>' +
             '</div>' +
             '</section>';
    }
  });

  function formatTime(time) {
    return DateSpan.time.render({
      time: time,
      format: 'shortTimeFormat'
    });
  }

  MonthsDay.eventSelector = '.event';
  MonthsDay.hourEventsSelector = '.events';

  Calendar.ns('Templates').MonthsDay = MonthsDay;
}(this));
