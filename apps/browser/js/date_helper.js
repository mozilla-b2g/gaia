DateHelper = {
  todayStarted: function ta_todayStarted() {
    var now = (new Date()).valueOf();
    return this.getMidnight(now);
  },

  yesterdayStarted: function ta_yesterdayStarted() {
    var now = (new Date()).valueOf();
    var dayAgo = now - 86400000;
    return this.getMidnight(dayAgo);
  },

  thisWeekStarted: function ta_thisWeekStarted() {
    var now = new Date();
    var dayOfTheWeek = now.getDay();
    var offset = 1 - dayOfTheWeek;
    var firstDay = now.valueOf() + offset * 86400000;
    return this.getMidnight(firstDay);
  },

  thisMonthStarted: function ta_thisMonthStarted() {
    var now = new Date();
    var firstDay = (new Date(
      now.getFullYear(),
      now.getMonth(),
      1).valueOf()
    );
    return firstDay;
  },

  thisYearStarted: function ta_thisYearStarted() {
    var now = new Date();
    var firstDay = (new Date(
      now.getFullYear(),
      0).valueOf()
    );
    return firstDay;
  },

  getMidnight: function ta_getMidnight(timestamp) {
    var day = new Date(timestamp);
    var midnight = (new Date(
      day.getFullYear(), 
      day.getMonth(),
      day.getDate(), 
      0).valueOf());
    return midnight;
  }
};
