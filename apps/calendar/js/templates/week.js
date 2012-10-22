(function(window) {
  var Week = Calendar.Template.create({
    header: '<h1 class="date">{value}</h1>',

    sidebarHour: '<li class="hour-{hour}">{displayHour}</li>',

    hour: [
      '<ol class="hour-{hour} events">',
        '{items|s}',
      '</ol>'
    ].join(''),

    event: [
      '<li class="event" data-id="{busytimeId}">',
        '<div class="container calendar-id-{calendarId} ' +
                    'calendar-display calendar-color">',
          '{title}',
        '</div>',
      '</li>'
    ].join('')
  });

  Week.eventSelector = '.event';
  Calendar.ns('Templates').Week = Week;
}(this));

