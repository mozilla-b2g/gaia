/**
 * DatePicker is a html/js "widget" which will display
 * all the days of a given month and allow selection of
 * one specific day. It also implements controls to travel
 * between months and jump into arbitrary time.
 *
 * The DatePicker itself contains no UI for the controls.
 *
 * Example usage:
 *
 *    // the container will have elements for the month
 *    // added and removed from it.
 *    var picker = new DatePicker(container);
 *
 *    // EVENTS:
 *
 *    // called when the user clicks a day in the calendar.
 *    picker.onvaluechange = function(date) {}
 *
 *    // called when the month of the calendar changes.
 *    // NOTE: at this time this can only happen programmatically
 *    //       so there is only for control flow.
 *    picker.onmonthchange = function(date) {}
 *
 *    // display a given year/month/date on the calendar the month
 *    // is zero based just like the JS date constructor.
 *    picker.display(2012, 0, 2);
 *
 *    // move to the next month.
 *    picker.next();
 *
 *    // move to the previous month
 *    picker.previous();
 *
 */
var DatePicker = (function() {
  'use strict';

  const SELECTED = 'selected';

  var Calc = {

    NEXT_MONTH: 'next-month',

    OTHER_MONTH: 'other-month',

    PRESENT: 'present',

    FUTURE: 'future',

    PAST: 'past',

    get today() {
      return new Date();
    },

    daysInWeek: function() {
      //XXX: We need to localize this...
      return 7;
    },

    /**
     * Checks is given date is today.
     *
     * @param {Date} date compare.
     * @return {Boolean} true when today.
     */
    isToday: function(date) {
      return Calc.isSameDate(date, Calc.today);
    },

    /**
     * Checks if two date objects occur
     * on the same date (in the same month, year, day).
     * Disregards time.
     *
     * @param {Date} first date.
     * @param {Date} second date.
     * @return {Boolean} true when they are the same date.
     */
    isSameDate: function(first, second) {
      return first.getMonth() == second.getMonth() &&
             first.getDate() == second.getDate() &&
             first.getFullYear() == second.getFullYear();
    },

    /**
     * Returns an identifier for a specific
     * date in time for a given date
     *
     * @param {Date} date to get id for.
     * @return {String} identifier.
     */
    getDayId: function(date) {
      return [
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ].join('-');
    },

    /**
     * Returns a date object from
     * a string id for a date.
     *
     * @param {String} id identifier for date.
     * @return {Date} date output.
     */
    dateFromId: function(id) {
      var parts = id.split('-');
      return new Date(parts[0], parts[1], parts[2]);
    },

    createDay: function(date, day, month, year) {
      return new Date(
        typeof year !== 'undefined' ? year : date.getFullYear(),
        typeof month !== 'undefined' ? month : date.getMonth(),
        typeof day !== 'undefined' ? day : date.getDate()
      );
    },

    /**
     * Finds localized week start date of given date.
     *
     * @param {Date} date any day the week.
     * @return {Date} first date in the week of given date.
     */
    getWeekStartDate: function(date) {
      var currentDay = date.getDay();
      var startDay = date.getDate() - currentDay;

      return Calc.createDay(date, startDay);
    },

    getWeekEndDate: function(date) {
      // TODO: There are localization problems
      // with this approach as we assume a 7 day week.
      var start = Calc.getWeekStartDate(date);
      start.setDate(start.getDate() + 7);
      start.setMilliseconds(-1);

      return start;
    },

    /**
     * Returns an array of dates objects.
     * Inclusive. First and last are
     * the given instances.
     *
     * @param {Date} start starting day.
     * @param {Date} end ending day.
     * @param {Boolean} includeTime include times start/end ?
     */
    daysBetween: function(start, end, includeTime) {
      if (!(start instanceof Date)) {
        throw new Error('start date must be an instanceof Date');
      }

      if (!(end instanceof Date)) {
        throw new Error('end date must be an instanceof Date');
      }

      if (start > end) {
        var tmp = end;
        end = start;
        start = tmp;
        tmp = null;
      }

      var list = [];
      var last = start.getDate();
      var cur;

      // for infinite loop protection.
      var max = 500;
      var macInc = 0;

      while (macInc++ < max) {
        var next = new Date(
          start.getFullYear(),
          start.getMonth(),
          ++last
        );

        if (next > end) {
          throw new Error(
            'sanity fails next is greater then end'
          );
        }

        if (!Calc.isSameDate(next, end)) {
          list.push(next);
          continue;
        }

        break;
      }

      if (includeTime) {
        list.unshift(start);
        list.push(end);
      } else {
        list.unshift(this.createDay(start));
        list.push(this.createDay(end));
      }

      return list;
    },

    /**
     * Checks if date is in the past
     *
     * @param {Date} date to check.
     * @return {Boolean} true when date is in the past.
     */
    isPast: function(date) {
      return (date.valueOf() < Calc.today.valueOf());
    },

    /**
     * Checks if date is in the future
     *
     * @param {Date} date to check.
     * @return {Boolean} true when date is in the future.
     */
    isFuture: function(date) {
      return !Calc.isPast(date);
    },

    /**
     * Based on the input date
     * will return one of the following states
     *
     *  past, present, future
     *
     * @param {Date} day for compare.
     * @param {Date} month comparison month.
     * @return {String} state.
     */
    relativeState: function(day, month) {
      var states;
      //var today = Calc.today;

      // 1. the date is today (real time)
      if (Calc.isToday(day)) {
        return Calc.PRESENT;
      }

      // 2. the date is in the past (real time)
      if (Calc.isPast(day)) {
        states = Calc.PAST;
      // 3. the date is in the future (real time)
      } else {
        states = Calc.FUTURE;
      }

      // 4. the date is not in the current month (relative time)
      if (day.getMonth() !== month.getMonth()) {
        states += ' ' + Calc.OTHER_MONTH;
      }

      return states;
    }

  };

  /* expose calc */
  DatePicker.Calc = Calc;

  /**
   * Initialize a date picker widget.
   *
   * @param {HTMLELement} element target of widget creation.
   */
  function DatePicker(element) {
    this.element = element;
    // default time is set so next/previous work
    // but we do not render the initial display here.
    this._position = new Date();

    // register events
    element.addEventListener('click', this);

    //XXX: When the document is localized again
    //     we must also re-render the month because
    //     the week days may have changed?
    //     This will only happen when we change timezones
    //     unless we add this information to the locales.
  }

  DatePicker.prototype = {

    /**
     * Internal value not exposed so we can fire events
     * when the getter/setter's are used.
     *
     * @type Date
     */
    _value: null,

    SELECTED: 'selected',

    /**
     * Gets current value
     *
     * @return {Null|Date} date or null.
     */
    get value() {
      return this._value;
    },

    /**
     * Sets the current value of the date picker.
     * When value differs from the currently set the
     * `onvaluechange` event will be fired with the new/old value.
     */
    set value(value) {
      var old = this._value;
      if (old !== value) {
        this._value = value;
        this._clearSelectedDay(value);
        this.onvaluechange(value, old);
      }
    },

    /**
     * Clears the currently selected date of its 'selected' class.
     * @private
     */
    _clearSelectedDay: function(value) {
      var target = this.element.querySelector('.' + SELECTED);
      if (target) {
        target.classList.remove(SELECTED);
      }
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'click':
          var target = e.target;
          //XXX: if the html of the date elements changes
          //     this may also need to be altered as it
          //     assumes that there is no nesting of elements.
          if (target.dataset.date) {
            var date = Calc.dateFromId(target.dataset.date);
            // order here is important as setting value will
            // clear all the past selected dates...
            this.value = date;
            this._position = date;
            // must come after setting selected date
            target.classList.add(SELECTED);
          }
          break;
      }
    },

    /**
     * Getter is used for date normalization.
     */
    get year() {
      return this._position.getFullYear();
    },

    /**
     * Getter is used for date normalization.
     */
    get month() {
      return this._position.getMonth();
    },

    get date() {
      return this._position.getDate();
    },

    /**
     * Find the number of days in the given month/year.
     * Month is zero based like the JS date constructor.
     *
     * @param {Numeric} year year value.
     * @param {Numeric} month month value.
     * @return {Numeric} number of days in month.
     */
    _daysInMonth: function(year, month) {
      var end = new Date(year, month + 1);
      end.setMilliseconds(-1);
      return end.getDate();
    },

    /**
     * Build the container for a day element.
     * Each element has classes added to it based
     * on what date it is created for.
     *
     * _today_ is based on today's actual date.
     * Each date element also contains a data-date attribute
     * with its current date as a string represented in
     * the following format: "yyyy-mm-dd".
     *
     * Possible classes:
     *    - past
     *    - present (today)
     *    - future
     *    - other-month (day of another month but falls within same week)
     *
     * @param {Date} date date desired.
     * @return {HTMLElement} dom element for day.
     */
    _renderDay: function(date) {
      var dayContainer = document.createElement('li');
      var dayEl = document.createElement('span');

      dayContainer.className = Calc.relativeState(
        date,
        this._position
      );

      dayEl.dataset.date = Calc.getDayId(date);
      dayEl.textContent = date.getDate();

      dayContainer.appendChild(dayEl);

      return dayContainer;
    },

    /**
     * Renders a set of dates and returns an ol element
     * containing each date.
     *
     * @private
     * @param {Array[Date]} dates array of dates.
     * @return {HTMLELement} container for week.
     */
    _renderWeek: function(dates) {
      var container = document.createElement('ol');
      var i = 0;
      var len = dates.length;

      for (; i < len; i++) {
        container.appendChild(
          this._renderDay(dates[i])
        );
      }

      return container;
    },

    /**
     * Finds all dates in a given month by week.
     * Includes leading and trailing days that occur
     * outside the given year/month combination.
     *
     * @private
     * @param {Numeric} year target year.
     * @param {Numeric} month target month.
     * @return {Array[Date]} array of dates.
     */
    _getMonthDays: function(year, month) {
      var date = new Date(year, month);
      var dateEnd = new Date(year, month + 1);
      dateEnd.setMilliseconds(-1);

      var start = Calc.getWeekStartDate(date);
      var end = Calc.getWeekEndDate(dateEnd);
      return Calc.daysBetween(start, end);
    },

    /**
     * Returns a section element with all
     * the days of the given month/year pair.
     *
     * Each month has a class for the number of weeks
     * it contains.
     *
     * Possible values:
     *  - weeks-4
     *  - weeks-5
     *  - weeks-6
     *
     * @private
     */
    _renderMonth: function(year, month) {
      var container = document.createElement('section');
      var days = this._getMonthDays(year, month);
      var daysInWeek = Calc.daysInWeek();
      var weeks = days.length / daysInWeek;
      var i = 0;

      container.classList.add('weeks-' + weeks);

      for (; i < weeks; i++) {
        container.appendChild(this._renderWeek(
          days.splice(0, daysInWeek)
        ));
      }

      return container;
    },

    /**
     * Moves calendar one month into the future.
     */
    next: function() {
      this.display(this.year, this.month + 1, this.date);
    },

    /**
     * Moves calendar one month into the past.
     */
    previous: function() {
      this.display(this.year, this.month - 1, this.date);
    },

    /**
     * Primary method to display given month.
     * Will remove the current display and replace
     * it with the given month.
     *
     * @param {Numeric} year year to display.
     * @param {Numeric} month month to display.
     * @param {Numeric} date date to display.
     */
    display: function(year, month, date) {

      // reset the date to the last date if overflow
      var lastDate = new Date(year, month + 1, 0).getDate();
      if (lastDate < date)
        date = lastDate;

      // Should come before render month
      this._position = new Date(year, month, date);

      var element = this._renderMonth(year, month);

      if (this.monthDisplay) {
        this.monthDisplay.parentNode.removeChild(
          this.monthDisplay
        );
      }

      this.monthDisplay = element;
      this.element.appendChild(this.monthDisplay);

      this.onmonthchange(this._position);

      // Set the date as selected if presented
      this._clearSelectedDay();
      if (date) {
        var dayId = Calc.getDayId(this._position);
        this.value = this._position;
        var selector = '[data-date="' + dayId + '"]';
        var dateElement = document.querySelector(selector);
        dateElement.classList.add(SELECTED);
      }
    },

    /**
     * Called when the month is changed.
     */
    onmonthchange: function(month, year) {},

    /**
     * Called when the selected day changes.
     */
    onvaluechange: function(date) {}
  };

  return DatePicker;
}());
