(function(window) {
  var template = Calendar.Templates.Month;

  function Child() {
    Calendar.View.apply(this, arguments);

    this.monthId = Calendar.Calc.getMonthId(this.month);
    this.controller = this.app.timeController;

    this._days = Object.create(null);
    this._timespan = this._setupTimespan(this.month);
  }

  Child.prototype = {
    __proto__: Calendar.View.prototype,

    INACTIVE: 'inactive',

    busyPrecision: (24 / 12),

    queueTime: 1,

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

    /**
     * Hack this should be localized.
     */
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

    //Override parent view...
    get element() {
      return this._element;
    },

    set element(val) {
      return this._element = val;
    },

    _dayId: function(date) {
      if (date instanceof Date) {
        date = Calendar.Calc.getDayId(date);
      }

      return 'month-view-' + this.monthId + '-' + date;
    },

    /**
     * We care about 5 weeks (35 days)
     */
    _setupTimespan: function(approxStart) {
      var approxEnd = new Date(approxStart.valueOf());
      //TODO: Localization problems assuming
      //length of week.

      var weeks = (4 * 7) + 1;

      approxEnd.setDate(approxStart.getDate() * weeks);

      var start = Calendar.Calc.getWeekStartDate(approxStart);
      var end = Calendar.Calc.getWeekEndDate(approxEnd);

      return new Calendar.Timespan(
        start,
        end
      );
    },

    _initEvents: function() {
      var busy = this.app.store('Busytime');
      busy.observeTime(this._timespan, this);
    },

    _destroyEvents: function() {
      var busy = this.app.store('Busytime');
      busy.removeTimeObserver(this._timespan, this);
    },

    handleEvent: function(event) {
      switch (event.type) {
        case 'add':
          this._renderBusytime(event.data);
          break;
        case 'remove':
          this._removeBusytimes([event.data]);
          break;
      }
    },

    /**
     * Calculates busy time unit based on an hour
     * of the day.
     *
     * @param {Numeric} hour integer hour.
     * @return {Numeric} integer busy unit.
     */
    _hourToBusyUnit: function(hour) {
      return Math.ceil(hour / this.busyPrecision) || 1;
    },

    _busyBlockFromRecord: function(record) {

      var startDate = record.startDate;
      var endDate = record.endDate;
      var start;
      var end;

      var startDateDay = startDate.getDate();
      var endDateDay = endDate.getDate();

      // this function is always called
      // with one day in mind if there
      // is more then a day gap between
      // dates its a multi-day event outside
      // of the ending scope of this busyblock.
      var distance = endDateDay - startDateDay;

      if (distance > 1) {
        start = 1;
        end = 12;
      } else {
        start = this._hourToBusyUnit(
          startDate.getHours()
        );

        // ends outside of current day
        if (distance === 1) {
          end = 12;
        } else {

        }
      }

      var out = template.busy.render({
        _id: this.cssClean(record._id),
        calendarId: record.calendarId,
        start: start,
        length: ((end - start) || 0) + 1
      });

      return out;

    },

    /**
     * Remove busytimes from the dom.
     *
     * @param {Array} objects list of busytime objects.
     */
    _removeBusytimes: function(objects) {
      var el = this.element;

      objects.forEach(function(item) {
        var className = '.busytime-' + this.cssClean(item._id);
        var elements = el.querySelectorAll(className);

        var i = 0;
        var len = elements.length;
        var instance;

        for (; i < len; i++) {
          instance = elements[i];
          instance.parentNode.removeChild(instance);
        }
      }, this);
    },

    /**
     * Renders out a day with busy times.
     *
     * @param {Date} date representing a date.
     */
    _renderDay: function _renderDay(date) {
      var month = Calendar.Calc.today.getMonth(),
          id = Calendar.Calc.getDayId(date),
          state,
          units,
          busytimes = this.app.store('Busytime');

      state = Calendar.Calc.relativeState(
        date,
        this.controller.currentMonth
      );

      // register instance in map
      this._days[id] = null;

      return template.day.render({
        id: this._dayId(id),
        dateString: id,
        state: state,
        date: date.getDate()
      });
    },

    /**
     * Renders a week from weekdays Array
     *
     */
    _renderWeek: function _renderWeek(days) {
      var output = [];

      for (var i = 0; i < days.length; i++) {
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
     * Finds day element busytime container.
     * Caches over time.
     *
     * @param {String|Date} date date id or date.
     */
    _busyElement: function(stringId) {
      var id;
      var found;

      if (typeof(stringId) !== 'string') {
        stringId = Calendar.Calc.getDayId(stringId);
      }

      id = this._dayId(stringId);

      found = this.element.querySelector(
        '#' + id + ' .busy-indicator'
      );

      return this._days[stringId] = found;
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
          numberOfWeeks = 0,
          lastWeek;

      for (; numberOfWeeks < 5; numberOfWeeks++) {
        lastWeek = Calendar.Calc.getWeeksDays(
          new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + (numberOfWeeks * 7)
          )
        );

        weekList.push(
          this._renderWeek(lastWeek)
        );
      }

     var lastMonthDay = 32 - new Date(
       date.getFullYear(),
       date.getMonth(),
       32).getDate();

     var lastRendered = lastWeek.pop().getDate();
     var additionalClass = '';

      // If the last rendered day number is lower that the last day of the
      // month, like on September or December 2012, we need to render
      // one more week.
      // We check if the number is bigger than the lowest possible number
      // of the last day in a month (February) to avoid adding additional
      // month when the last rendered day belong to the next month
      if (lastRendered < lastMonthDay && lastRendered > 27) {
        additionalClass = 'six-weeks';
        weekList.push(
          this._renderWeek(
            Calendar.Calc.getWeeksDays(
              new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate() + (5 * 7)
              )
            )
          )
        );
      }

      return template.month.render({
        id: id,
        content: weekList.join('\n'),
        additionalClass: additionalClass
      });
    },

    _calculateBusytime: function(day, busytime) {
      var record = {
        _id: this.cssClean(busytime._id),
        eventId: busytime.eventId,
        calendarId: busytime.calendarId
      };

      var startDateDay = busytime.startDate.getDate();
      var endDateDay = busytime.endDate.getDate();
      var targetDay = day.getDate();

      if (targetDay == startDateDay) {
        record.start = this._hourToBusyUnit(
          busytime.startDate.getHours()
        );
      } else {
        record.start = 1;
      }

      if (targetDay == endDateDay) {
        var end = this._hourToBusyUnit(
          busytime.endDate.getHours()
        );

        record.length = ((end - record.start) || 0) + 1;

      } else {
        record.length = 12;
      }

      return record;
    },

    _addBusytime: function(date, busytime) {
      var element = this._busyElement(date);

      var html = template.busy.render(
        this._calculateBusytime(date, busytime)
      );

      element.insertAdjacentHTML(
        'afterbegin',
        html
      );
    },

    _renderBusytime: function(busytime) {
      // render out a busytime span
      var span = this._timespan;

      // 1: busytime start/end occurs all on same month/day
      var start = busytime.startDate;
      var end = busytime.endDate;

      if (Calendar.Calc.isSameDate(start, end)) {
        return this._addBusytime(start, busytime);
      }

      // 2: busytime start/end occurs on different days
      if (!span.contains(start) && !span.contains(end)) {
        // 2a: if its outside our range entirely
        // we know its going to occur during every day
        Object.keys(this._days).forEach(function(date) {
          this._addBusytime(date, busytime);
        }, this);
      } else {
        // 2b: if inside range
        // get all dates (inclusive) that need to be
        // updated.
        var days = Calendar.Calc.daysBetween(
          start,
          end
        );

        days.forEach(function(date) {
          this._addBusytime(date, busytime);
        }, this);
      }

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
      var busytimes = this.app.store('Busytime');

      element.insertAdjacentHTML('beforeend', html);
      this.element = element.children[element.children.length - 1];

      busytimes.busytimesInCachedSpan(this._timespan).forEach(
        this._renderBusytime,
        this
      );

      this._initEvents();

      return this.element;
    },

    destroy: function() {
      this._destroyEvents();
      this._days = Object.create(null);

      if (this.element) {
        this.element.parentNode.removeChild(this.element);
        this.element = undefined;
      }
    }

  };

  Calendar.ns('Views').MonthChild = Child;
}(this));
