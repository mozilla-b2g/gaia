(function(window) {

  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  var template = Calendar.Templates.Month;


  function Child(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Child.prototype = {
    INACTIVE: 'inactive',

    busyPercision: (24 / 12),

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

    monthNames: [
      'January',
      'Feburary',
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

    /**
     * Returns a list of busy units based
     * on an array of hours.
     *
     * @param {Array} hours list of hours.
     * @return {Array} list of busy units.
     */
    _getBusyUnits: function _getBusyUnits(hours) {
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

    /**
     * Returns an html blob of busy units.
     *
     * @param {Array} hours list of hours.
     */
    _renderBusyUnits: function _renderBusyUnits(hours) {
      return template.busy.renderEach(
        this._getBusyUnits(hours)
      ).join('');
    },

    /**
     * Renders out a day with busy times.
     *
     * @param {Date} date representing a date.
     */
    _renderDay: function _renderDay(date) {
      var hours,
          month = Calendar.Calc.today.getMonth(),
          id = Calendar.Calc.getDayId(date),
          state,
          busytimes = this.controller.busytime;

      hours = busytimes.getHours(date);
      state = Calendar.Calc.relativeState(
        date,
        this.controller.currentMonth
      );

      return template.day.render({
        id: 'month-view-' + id,
        dateString: id,
        state: state,
        date: date.getDate(),
        busy: this._renderBusyUnits(hours)
      });
    },

    /**
     * Renders a week based on a start date.
     *
     * @param {Object} object config options.
     */
    _renderWeek: function _renderWeek(start) {
      var days = Calendar.Calc.getWeeksDays(start),
          output = [],
          i = 0;


      for (i; i < days.length; i++) {
        output.push(this._renderDay(days[i]));
      }

      return template.week.render(output.join(''));
    },

    /**
     * Renders out the calendar headers.
     *
     * TODO: This can be optimized so we only need
     * to do this once
     *
     * @return {String} returns a list of headers.
     */
    _renderDayHeaders: function _renderDayHeaders() {
      var days;

      days = template.weekDaysHeaderDay.renderEach(
        this.dayNames
      );

      return template.weekDaysHeader.render(
        days.join('')
      );
    },

    /**
     * Renders out an entire month.
     *
     * @param {Date} date date which month resides in.
     * @return {String} return value.
     */
    _renderMonth: function _renderMonth() {
      var date = this.month,
          id = Calendar.Calc.getDayId(this.month),
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

      return template.month.render({
        id: id,
        content: weekList.join('\n')
      });
    },

    /**
     * Activate this child view visually.
     */
    activate: function() {
      this.element.classList.remove(this.INACTIVE);
    },

    /**
     * Deactivate this child view visually.
     */
    deactivate: function() {
      this.element.classList.add(this.INACTIVE);
    },

    /**
     * Attaches child view to dom node
     * or object that has a .element.
     *
     * Sets the .element
     *
     * @return {DOMElement} inserted dom node.
     */
    attach: function(element) {
      var html = this._renderMonth();
      element.insertAdjacentHTML('beforeend', html);
      this.element = element.children[element.children.length - 1];

      return this.element;
    },

    destroy: function() {
      if (this.element) {
        this.element.parentNode.removeChild(this.element);
        this.element = undefined;
      }
    }

  };

  Calendar.Views.MonthChild = Child;
}(this));
