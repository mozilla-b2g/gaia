(function(window) {
  var Week = Calendar.Template.create({
    header: function() {
      return '<h1 class="date">' + this.h('value') + '</h1>';
    },

    sidebarHour: function() {
      return '<li class="hour-' + this.h('hour') + '">' + this.h('displayHour') + '</li>';
    },

    hour: function() {
      return '<ol class="hour-' + this.h('hour') + ' events">' +
          this.s('items') +
        '</ol>';
    },

    event: function() {
      return '<li class="event" data-id="' + this.h('busytimeId') + '">' +
          '<div class="container calendar-id-' + this.h('calendarId') + ' ' +
                      'calendar-display calendar-color">' +
            this.h('title') +
          '</div>' +
        '</li>';
    }
  });

  Week.eventSelector = '.event';
  Calendar.ns('Templates').Week = Week;
}(this));

