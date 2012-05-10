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
  function Month() {
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
        unit = Math.floor(hours[i] / this.busyPercision) || 1;
        if (!(unit in set)) {
          result.push(unit);
          set[unit] = true;
        }
      }

      return result;
    },

    _renderBusyUnits: function(units) {
      var i = 0, busyUnits = [], unit;
      for (i; i < units.length; i++) {
        unit = Math.floor(units[i] / this.busyPercision);
        busyUnits.push(format(this.templates.busyIndicator, unit));
      }

      return busyUnits.join('');
    },

    /**
     * Renders out a day with busy times.
     *
     * @param {Object} object representing a day.
     * @param {Numeric} object.id id for day.
     * @param {Numeric} object.name name of day.
     * @param {Array} object.busyTimes array of hours user is busy.
     */
    _renderDay: function(object) {
      var busyHtml = this._renderBusyUnits(object.busyTimes),
          day = object.day,
          id = Calendar.Calc.getDayId(day),
          klass = Calendar.Calc.relativeState(day);

      return format(
        this.templates.monthSectionDay,
        id,
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
    _renderWeek: function(object) {
      
    }

  };

  Calendar.Views.Month = Month;

}(this));
