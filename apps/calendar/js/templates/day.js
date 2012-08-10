(function(window) {
  var Day = Calendar.Template.create({
    hour: [
      '<section class="hour-{hour}">',
        '<h4>{displayHour}</h4>',
        '<ol class="events">',
          '{items|s}',
        '</ol>',
      '</section>'
    ].join(''),

    attendee: '<span class="attendee">{value}</span>',

    event: [
      '<li class="event">',
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

  Calendar.ns('Templates').Day = Day;
}(this));

