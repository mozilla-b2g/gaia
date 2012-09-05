(function(window) {

  var Month = Calendar.Template.create({
    busy: '<span class="' +
              'busytime-{_id} ' +
              'busy-length-{length} ' +
              'busy-{start} ' +
              'calendar-id-{calendarId} calendar-color calendar-display' +
            '">' +
            '&nbsp;' +
          '</span>',

    weekDaysHeader: [
      '<header id="month-days">',
        '<ol role="row">',
          '{value|s}',
        '</ol>',
      '</header>'
    ].join(''),

    weekDaysHeaderDay: [
      '<li data-l10n-id="weekday-{day}-short">',
        '{dayName}',
      '</li>'
    ].join(''),

    week: [
      '<ol role="row">',
        '{value|s}',
      '</ol>'
    ].join(''),

    day: [
      '<li id="{id|s}" data-date="{dateString|s}" class="{state|s}">',
        '<span class="day">{date}</span>',
        '<div class="busy-indicator">{busy|s}</div>',
      '</li>'
    ].join('')
  });

  Calendar.ns('Templates').Month = Month;

}(this));
