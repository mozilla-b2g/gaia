(function(window) {

  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  var format = Calendar.format;

  /**
   * Creates an instance of a month.
   */
  function Month(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }
    this.busytimes = options.busytimes;
    this.monthSelector = options.monthSelector || '#month-displays';
  };

  Month.prototype = {

    templates: {

      monthDaysHeader: [
        '<header id="month-days" role="row">',
          '<ol role="row">',
            '%s',
          '</ol>',
        '</header>'
      ].join(''),

      monthDaysHeaderDay: [
        '<li role="column">',
          '%s',
        '</li>'
      ].join(''),

      monthSection: [
        '<section id="%s" class="month">',
          '%s',
        '</section>'
      ].join(''),

      monthSectionRow: [
        '<ol role="row">',
          '%s',
        '</ol>'
      ].join(''),

      monthSectionDay: [
        '<li id="%s" class="%s">',
          '<span class="day">%s</span>',
          '<div class="busy-indicator">%s</div>',
        '</li>'
      ].join(''),

      busyIndicator: '<span class="busy-%s">&nbsp;</span>'
    },

    /**
     * Hack this should be localized.
     */
    dayNames: [
      'sun',
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat'
    ],

    busyPercision: (24 / 12),

    /**
     * Returns a list of busy units based
     * on an array of hours.
     *
     * @param {Array} hours list of hours.
     * @return {Array} list of busy units.
     */
    _getBusyUnits: function(hours) {
      var set = {},
          result = [],
          i = 0,
          unit;

      for (; i < hours.length; i++) {
        unit = Math.ceil(hours[i] / this.busyPercision) || 1;
        if (!(unit in set)) {
          result.push(unit);
          set[unit] = true;
        }
      }

      return result;
    },

    _renderBusyUnits: function(units) {
      var i = 0,
          units = this._getBusyUnits(units),
          busyUnits = [];

      for (i; i < units.length; i++) {
        busyUnits.push(format(this.templates.busyIndicator, units[i]));
      }

      return busyUnits.join('');
    },

    /**
     * Renders out a day with busy times.
     *
     * @param {Date} day representing a day.
     */
    _renderDay: function(day) {
      var busyHtml,
          hours,
          day = day,
          id = Calendar.Calc.getDayId(day),
          klass = Calendar.Calc.relativeState(day);

      hours = this.busytimes.getHours(day);
      busyHtml = this._renderBusyUnits(hours);

      return format(
        this.templates.monthSectionDay,
        'month-view-' + id,
        klass,
        day.getDate(),
        busyHtml
      );
    },

    /**
     * Renders a week based on a start date.
     *
     * @param {Object} object config options.
     */
    _renderWeek: function(start) {
      var days = Calendar.Calc.getWeeksDays(start),
          output = [],
          i = 0;


      for (i; i < days.length; i++) {
        output.push(this._renderDay(days[i]));
      }

      return format(this.templates.monthSectionRow, output.join(''));
    },

    /**
     * Renders out the calendar headers.
     *
     * @return {String} returns a list of headers.
     */
    _renderDayHeaders: function() {
      var headerList = [],
          i;

      for (i = 0; i < this.dayNames.length; i++) {
        headerList.push(
          format(
            this.templates.monthDaysHeaderDay,
            this.dayNames[i]
          )
        );
      }

      return format(
        this.templates.monthDaysHeader,
        headerList.join('')
      );

    },

    /**
     * Renders out an entire month.
     *
     * @param {Date} date date which month resides in.
     * @return {String} return value.
     */
    _renderMonth: function(date) {
      var id = Calendar.Calc.getDayId(date),
          weekList = [],
          i;

      for (i = 0; i < 5; i++) {
        var week = weekList.push(
          this._renderWeek(
            new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate() + (i * 7)
            )
          )
        );
      }

      return format(
        this.templates.monthSection,
        id,
        weekList.join('\n')
      );
    },

    /**
     * Finds and returns element.
     *
    * @return {HTMLElement} container for month view.
     */
    monthsDisplayElement: function() {
      var selector;
      if (!this._monthDisplayEl) {
        selector = this.monthSelector;
        this._monthDisplayEl = document.body.querySelector(selector);
      }
      return this._monthDisplayEl;
    },

    /**
     * Appends given month to display area.
     *
     * @param {Date} date current month this should \
     *                  usually be the starting date of
     *                  a given month.
     */
    appendMonth: function(date) {
      var el = document.createElement('div');
      el.innerHTML = this._renderMonth(date);

      this.monthsDisplayElement().appendChild(
        el.firstChild
      );

      delete el;
    },

    /**
     * Render current month
     */
    render: function() {
      var el = this.monthsDisplayElement(),
          now = new Date();

      now.setDate(1);

      this.appendMonth(now);
    }

  };

  Calendar.Views.Month = Month;

}(this));
