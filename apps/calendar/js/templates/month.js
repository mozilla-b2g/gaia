(function(window) {
  if (typeof(Calendar.Templates) === 'undefined') {
    Calendar.Templates = {};
  }

  function Month() {
    var key;

    this.templates = Calendar.Template.create({
      busy: '<span class="busy-{value}">&nbsp;</span>',

      currentMonth: [
        '<span class="month">{month}</span>',
        '<span class="year">{year}</span>'
      ].join(' '),

      weekDaysHeader: [
        '<header id="month-days" role="row">',
          '<ol role="row">',
            '{value|s}',
          '</ol>',
        '</header>'
      ].join(''),

      weekDaysHeaderDay: [
        '<li role="column">',
          '{value}',
        '</li>'
      ].join(''),

      month: [
        '<section id="{id}" class="month">',
          '{content|s}',
        '</section>'
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
      ].join(''),

    });

    for (key in this.templates) {
      if (!(key in this)) {
        //this is super ugly
        this[key] = this.templates[key];
      }
    }
  }

  Calendar.Templates.Month = Month;
}(this));
