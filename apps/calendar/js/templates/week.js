(function(window) {
  'use strict';

  var Week = Calendar.Template.create({
    header: function() {
      return '<h1' + (this.arg('isToday') ? ' class="is-today"' : '') + '>' +
        this.h('title') + '</h1>';
    },

    sidebarHour: function() {
      var hour = this.h('hour');
      var displayHour = this.h('displayHour');

      return '<li class="hour-' + hour + '">' +
                displayHour +
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
        'calendar-display',
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
          '<span class="all-day icon-allday">' +
            this.l10n('', 'hour-allday') +
          '</span>' +
        '</section>' +
        '<div class="scroll">' +
          '<ol class="sidebar"></ol>' +
          '<section class="children"></section>' +
        '</div>';
    }
  });

  Week.eventSelector = '.event';
  Calendar.ns('Templates').Week = Week;
}(this));

