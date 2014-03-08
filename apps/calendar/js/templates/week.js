/*global Calendar*/
(function(window) {
  'use strict';

  var Week = Calendar.Template.create({
    header: function() {
      return '<h1>' + this.h('value') + '</h1>';
    },

    sidebarHour: function() {
      var hour = this.h('hour');
      var displayHour = this.h('displayHour');

      return '<li ' + hour + ' class="hour-' + hour + '">' +
                displayHour +
              '</li>';
    },

    hour: function() {
      return '<ol class="hour-' + this.h('hour') + ' events">' +
          this.s('items') +
        '</ol>';
    },

    event: function() {
      var eventClassName = 'calendar-id-' + this.h('calendarId') + ' ' +
        'calendar-display calendar-bg-color calendar-border-color';
      return '<li class="event ' + eventClassName +
        '" data-id="' + this.h('busytimeId') + '">' +
          '<div class="container">' +
            this.h('title') +
          '</div>' +
        '</li>';
    },

    frame: function() {
      return '<section class="sticky">' +
          '<section class="children">' +
            '<span class="all-day icon-allday">' +
              this.l10n('', 'hour-allday') +
            '</span>' +
          '</section>' +
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

