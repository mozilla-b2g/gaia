(function(window) {
  var Week = Calendar.Template.create({
    header: function() {
      return '<h1>' + this.h('value') + '</h1>';
    },

    sidebarHour: function() {
      var hour = this.h('hour');
      var displayHour = this.h('displayHour');

      return '<li ' + hour + ' class="hour-' + this.h('hour') + '">' +
                displayHour +
              '</li>';
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
    },

    frame: function() {
      return '<section class="sticky">' +
          '<section class="children">' +
            '<span class="all-day">' +
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

