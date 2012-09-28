(function(window) {
  var Week = Calendar.Template.create({
    hour: [
      '<section class="hour">',
        '<h4>',
          '<span class="display-hour {hour} "></span>',
        '</h4>',
      '</section>'
    ].join(''),
    
    weekDaysHeader: [
      '<header id="month-days">',
        '<ol role="row">',
          '{value|s}',
        '</ol>',
      '</header>'
    ].join(''),

    weekDaysHeaderDay: [
      '<section data-l10n-id="weekday-{day}-short" class="day-header">',
        '{dayName} {dayNumber}',
      '</section>'
    ].join(''),
    
    day: [
      '<section class="week-view-day">',
        '{value|s}',
      '</section>'
    ].join(''),
    
    hourSidebar: [
      '<section id="hours-sidebar">',
          '{value|s}',
      '</header>'
    ].join(''),
    
    hourSidebarElement: [
      '<section id="hours-sidebar-element">',
        '<h4>',
          '<span class="display-hour">{hour}</span>',
        '</h4>',
      '</header>'
    ].join(''),
    
    attendee: '<span class="attendee">{value}</span>',

    event: [
      '<li class="event calendar-id-{calendarId}' +
           'calendar-display" data-id="{eventId}">',
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

  Week.hourEventsSelector = '.events';

  Calendar.ns('Templates').Week = Week;
}(this));

