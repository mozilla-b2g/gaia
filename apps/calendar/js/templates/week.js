(function(window) {
  var Week = Calendar.Template.create({
    header: function() {
      return '<h1 class="date">' + this.h('value') + '</h1>';
    },

    sidebarHour: function() {
      var l10n = '';
      var hour = this.h('hour');
      var displayHour;

      if (hour === Calendar.Calc.ALLDAY) {
        l10n = ' data-l10n-id="hour-allday" ';
        displayHour = navigator.mozL10n.get('hour-allday');
      } else {
        displayHour = this.h('displayHour');
      }

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
          '<div class="container calend +ar-id-' + this.h('calendarId') + ' ' +
                      'calendar-display calendar-color">' +
            this.h('title') +
          '</div>' +
        '</li>';
    }
  });

  Week.eventSelector = '.event';
  Calendar.ns('Templates').Week = Week;
}(this));

