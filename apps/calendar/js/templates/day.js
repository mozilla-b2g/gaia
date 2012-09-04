(function(window) {
  var Day = Calendar.Template.create({
    hour: [
      '<section class="hour-{hour} {classes} calendar-display">',
        '<h4>',
          '<span class="calendar-color"></span>',
          '<span class="display-hour {hour}">{displayHour}</span>',
        '</h4>',
        '<ol class="events">',
          '{items|s}',
        '</ol>',
      '</section>'
    ].join(''),

    attendee: '<span class="attendee">{value}</span>',

    event: [
      '<li class="event calendar-id-{calendarId} calendar-display">',
        '<h5>{title}</h5>',
        '<span class="details">',
          '<span class="location">',
            '{location}',
          '</span>',
          '{attendees|s}',
        '</span>',
      '</li>'
    ].join('')
  });

  Day.hourEventsSelector = '.events';

  Calendar.ns('Templates').Day = Day;
}(this));

