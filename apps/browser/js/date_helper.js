DateHelper = {
  //TODO: localise
  MONTHS: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ],

  todayStarted: function dh_todayStarted() {
    var now = (new Date()).valueOf();
    return this.getMidnight(now);
  },

  yesterdayStarted: function dh_yesterdayStarted() {
    var now = (new Date()).valueOf();
    var dayAgo = now - 86400000;
    return this.getMidnight(dayAgo);
  },

  thisWeekStarted: function dh_thisWeekStarted() {
    var now = new Date();
    var dayOfTheWeek = now.getDay();
    var offset = 1 - dayOfTheWeek;
    var firstDay = now.valueOf() + offset * 86400000;
    return this.getMidnight(firstDay);
  },

  thisMonthStarted: function dh_thisMonthStarted() {
    var now = new Date();
    var firstDay = (new Date(
      now.getFullYear(),
      now.getMonth(),
      1).valueOf()
    );
    return firstDay;
  },

  lastSixMonthsStarted: function dh_lastSixMonthsStarted() {
    var now = new Date().valueOf();
    var sixMonthsAgo = now - 2629743830 * 6;
    return sixMonthsAgo;
  },

  thisYearStarted: function dh_thisYearStarted() {
    var now = new Date();
    var firstDay = (new Date(
      now.getFullYear(),
      0).valueOf()
    );
    return firstDay;
  },

  getMidnight: function dh_getMidnight(timestamp) {
    var day = new Date(timestamp);
    var midnight = (new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      0).valueOf());
    return midnight;
  }
};
