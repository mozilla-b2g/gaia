(function(window) {
  if (typeof(Calendar.Templates) === 'undefined') {
    Calendar.Templates = {};
  }

  var Day = Calendar.Template.create({
    hour: [
      '<section>',
        '<h4>{hour}</h4>',
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
          '\n-\n',
          '{attendees|s}',
        '</span>',
      '</li>'
    ].join('')
  });

  Calendar.Templates.Day = Day;
}(this));

