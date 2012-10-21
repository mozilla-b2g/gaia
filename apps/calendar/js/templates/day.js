(function(window) {
  var Day = Calendar.Template.create({
    hour: [
      '<section class="hour hour-{hour} {classes} calendar-display">',
        '<h4>',
          '<span class="display-hour {hour}">{displayHour}</span>',
        '</h4>',
        /** has no semantic value - re-evaluate */
        '<div class="events">{items|s}</div>',
      '</section>'
    ].join(''),

    attendee: '<span class="attendee">{value}</span>',

    event: [
      '<section class="event calendar-id-{calendarId} ' +
           'calendar-display" data-id="{busytimeId}">',
        '<div class="container calendar-id-{calendarId} calendar-color">',
          '<h5>{title}</h5>',
          '<span class="details">',
            '<span class="location">',
              '{location}',
            '</span>',
            '{attendees|s}',
          '</span>',
        '</div>',
      '</section>'
    ].join('')
  });

  Day.eventSelector = '.event';
  Day.hourEventsSelector = '.events';

  Calendar.ns('Templates').Day = Day;
}(this));

