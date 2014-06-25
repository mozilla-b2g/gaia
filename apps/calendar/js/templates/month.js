(function(window) {
  'use strict';

  var Month = Calendar.Template.create({
    busy: function() {
      return '<span class="' +
                'busytime-' + this.h('_id') +
                ' busy-length-' + this.h('length') +
                ' busy-' + this.h('start') +
                ' calendar-id-' + this.h('calendarId') +
              '">' +
              '&nbsp;' +
            '</span>';
    },

    weekDaysHeader: function() {
      return '<header id="month-days">' +
          '<ol role="row">' +
            this.s('value') +
          '</ol>' +
        '</header>';
    },

    weekDaysHeaderDay: function() {
      return '<li data-l10n-id="' + this.h('l10n') + '">' +
          this.h('dayName') +
        '</li>';
    },

    week: function() {
      return '<ol role="row">' +
          this.s('value') +
        '</ol>';
    },

    day: function() {
      return '<li id="' + this.s('id') +
                  '" data-date="' + this.s('dateString') +
                  '" class="' + this.s('state') + '">' +
          '<span class="day">' + this.h('date') + '</span>' +
          '<div class="busy-indicator"></div>' +
        '</li>';
    }
  });

  Calendar.ns('Templates').Month = Month;

}(this));
