(function(window) {
  'use strict';

  var MonthsDay = Calendar.Template.create({
    event: function() {
      var calendarId = this.h('calendarId');

      var sectionClassList = [
        'event',
        'calendar-id-' + calendarId,
        'calendar-display',
        this.h('classes')
      ].join(' ');

      var containerClassList = [
        'container',
        'calendar-id-' + calendarId
      ].join(' ');

      this.eventTime = function() {
        return this.h('isAllDay') ?
          '<div class="all-day">All Day</div>' :
          ('<div class="start-time">' + this.h('startTime') + '</div>' +
           '<div class="end-time">' + this.h('endTime') + '</div>');
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
               '<div class="icon-dot calendar-text-color"></div>' +
               '<div class="event-time">' + this.eventTime() + '</div>' +
               '<div class="event-details">' + this.eventDetails() + '</div>' +
               '<div class="icon-alarm calendar-text-color"></div>' +
             '</div>' +
             '</section>';
    }
  });

  MonthsDay.eventSelector = '.event';
  MonthsDay.hourEventsSelector = '.events';

  Calendar.ns('Templates').MonthsDay = MonthsDay;
}(this));
