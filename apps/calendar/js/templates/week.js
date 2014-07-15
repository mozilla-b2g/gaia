(function(window) {
  'use strict';

  var Week = Calendar.Template.create({
    header: function() {
      return '<h1>' + this.h('title') + '</h1>';
    },

    sidebarHour: function() {
      var hour = this.h('hour');
      var displayHour = this.s('displayHour');

      return '<li class="hour hour-' + hour + '">' +
                '<span class="display-hour">' + displayHour + '</span>' +
              '</li>';
    },

    hour: function() {
      return '<ol class="hour-' + this.h('hour') + ' events">' +
          this.s('items') +
        '</ol>';
    },

    event: function() {
      var eventClassName = [
        'event',
        'calendar-id-' + this.h('calendarId'),
        'calendar-bg-color',
        'calendar-border-color'
      ].join(' ');

      return '<li class="' + eventClassName +
        '" data-id="' + this.h('busytimeId') + '">' +
          '<div class="container">' +
            this.h('title') +
          '</div>' +
        '</li>';
    },

    frame: function() {
      return '<section class="sticky">' +
          '<span class="all-day gaia-icon icon-calendar-allday"></span>' +
        '</section>' +
        '<div class="scroll">' +
          '<div class="scroll-content">' +
            '<ol class="sidebar"></ol>' +
            '<section class="children"></section>' +
          '</div>' +
        '</div>';
    }
  });

  Week.eventSelector = '.event';
  Calendar.ns('Templates').Week = Week;
}(this));

