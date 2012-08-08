(function(window) {
  var template = Calendar.Templates.Month;

  function Child() {
    Calendar.View.apply(this, arguments);

    this.monthId = Calendar.Calc.getMonthId(this.month);
    this.controller = this.app.timeController;

    var end = new Date(this.month.valueOf());
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(-1);

    this._timespan = new Calendar.Timespan(
      this.month,
      end
    );
  }

  Child.prototype = {
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

    _dayId: function(date) {
      if (date instanceof Date) {
        date = Calendar.Calc.getDayId(date);
      }

      return 'month-view-' + this.monthId + '-' + date;
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
          this._addBusyUnit(event.data);
          break;
        case 'remove':
          this._removeBusyUnits([event.data]);
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

    /**
     * Renders multiple blocks
     */
    _renderBlocks: function(list) {
      var i = 0;
      var len = list.length;
      var html = '';

      for (; i < len; i++) {
        html += this._busyBlockFromRecord(list[i]);
      }

      return html;
    },

    _busyBlockFromRecord: function(record) {
      var start = this._hourToBusyUnit(
        record.startDate.getHours()
      );

      var end = this._hourToBusyUnit(
        record.endDate.getHours()
      );

      return template.busy.render({
        _id: record._id,
        calendarId: record.calendarId,
        start: start,
        length: ((end - start) || 1)
      });
    },

    _addBusyUnit: function(busyUnit) {
      var id = this._dayId(busyUnit.startDate);
      var element = document.getElementById(id);

      element = element.querySelector('.busy-indicator');

      element.insertAdjacentHTML(
        'afterbegin',
        this._busyBlockFromRecord(busyUnit)
      );
    },

    /**
     * Remove busytimes from the dom.
     *
     * @param {Array} busytime ids.
     */
    _removeBusyUnits: function(ids) {
      var el = this.element;
      var i = 0;
      var len = ids.length;
      var instance;
      var id;

      for (; i < len; i++) {
        id = 'busytime-' + ids[i];
        instance = document.getElementById(id);
        if (instance) {
          instance.parentNode.removeChild(instance);
        }
      }
    },

    /**
     * Returns an html blob of busy units.
     * Based on a date.
     */
    _renderBusyUnits: function _renderBusyUnits(date) {
      var start = date;
      var end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 1
      );

      end.setMilliseconds(-1);

      var range = new Calendar.Timespan(start, end);
      var list = this.app.store('Busytime').cachedStartsIn(
        range
      );

      return this._renderBlocks(list);
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

      return template.day.render({
        id: this._dayId(id),
        dateString: id,
        state: state,
        date: date.getDate(),
        busy: this._renderBusyUnits(date)
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

      this._initEvents();

      return this.element;
    },

    destroy: function() {
      this._destroyEvents();

      if (this.element) {
        this.element.parentNode.removeChild(this.element);
        this.element = undefined;
      }
    }

  };

  Calendar.ns('Views').MonthChild = Child;
}(this));
