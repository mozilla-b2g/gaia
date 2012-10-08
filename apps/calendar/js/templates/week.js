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
      '<li class="event calendar-id-{calendarId}' +
           'calendar-display calendar-color" data-id="{eventId}">',
        '{title}',
      '</li>'
    ].join('')
  });

  Calendar.ns('Templates').Week = Week;
}(this));

