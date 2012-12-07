(function(window) {

  var Day = Calendar.Template.create({
    hour: function() {
      return '<section class="hour hour-' + this.h('hour') + ' ' + this.h('classes') + ' calendar-display">' +
          '<h4>' +
            '<span class="display-hour ' + this.h('hour') + '">' + this.h('displayHour') + '</span>' +
          '</h4>' +
          /** has no semantic value - re-evaluate */
          '<div class="events">' + this.s('items') + '</div>' +
        '</section>';
    },

    attendee: function() {
      return '<span class="attendee">' + this.h('value') + '</span>';
    },

    event: function() {
      return '<section class="event calendar-id-' + this.h('calendarId') + ' ' +
             'calendar-display" data-id="' + this.h('busytimeId') + '">' +
          '<div class="container calendar-id-' + this.h('calendarId') + ' calendar-color">' +
            '<h5>' + this.h('title') + '</h5>' +
            '<span class="details">' +
              '<span class="location">' +
                this.h('location') +
              '</span>' +
              this.s('attendees') +
            '</span>' +
          '</div>' +
        '</section>';
    }
  });

  Day.eventSelector = '.event';
  Day.hourEventsSelector = '.events';

  Calendar.ns('Templates').Day = Day;
}(this));
