(function(window) {
  var template = Calendar.Templates.Month;

  function Child() {
    Calendar.View.apply(this, arguments);

    this.batch = new Calendar.Batch({
      handler: this._handleBatch.bind(this),
      verify: this._verifyBatchItem.bind(this)
    });

    this._busytimes = Object.create(null);
    this.monthId = Calendar.Calc.getMonthId(this.month);

    this._onBusyAdd = this._onBusyAdd.bind(this);
    this._onBusyRemove = this._onBusyRemove.bind(this);

    this.controller = this.app.timeController;
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

    _busyClass: function(unit) {
      return 'busy-' + unit;
    },

    /**
     * Finds or create the set for a given dateId.
     *
     * @param {String} dateId id.
     * @return {Calender.Set} set object.
     */
    _busySet: function(dateId) {
      if (dateId in this._busytimes) {
        return this._busytimes[dateId];
      }

      return this._busytimes[dateId] = new Calendar.Set();
    },

    /**
     * Handles incoming batch for adds/removes.
     */
    _handleBatch: function(items) {
      var dateId, actions;

      for (dateId in items) {
        actions = items[dateId];

        if (actions.add) {
          this._appendBusyUnits(dateId, actions.add);
        }

        if (actions.remove) {
          this._removeBusyUnits(dateId, actions.remove);
        }
      }
    },

    /**
     * Verifies that an item mutation should be
     * added to the batch.
     *
     * @param {String} group usually a dateId.
     * @param {String} action usually add/remove.
     * @param {Object} value some data associated /w the action.
     */
    _verifyBatchItem: function(group, action, value) {
      var set = this._busySet(group);

      switch (action) {
        case 'add':
          if (set.has(value)) {
            return false;
          }
          set.add(value);
          break;
      }

      return true;
    },

    _initEvents: function() {
      var busy = this.app.store('Busytime');

      //TODO: Its a known issue that changes in days in different
      //      months for this view will not be changed.
      busy.on('add ' + this.monthId, this._onBusyAdd);
      busy.on('remove ' + this.monthId, this._onBusyRemove);
    },

    _destroyEvents: function() {
      var busy = this.app.store('Busytime');

      busy.removeEventListener(
        'add ' + this.monthId, this._onBusyAdd
      );

      busy.removeEventListener(
        'remove ' + this.monthId, this._onBusyRemove
      );
    },

    _onBusyAdd: function(id, date) {
      this.batch.action(
        Calendar.Calc.getDayId(date),
        'add',
        this._hourToBusyUnit(date.getHours())
      );
    },

    _onBusyRemove: function(id, date) {
      this.batch.action(
        Calendar.Calc.getDayId(date),
        'remove',
        this._hourToBusyUnit(date.getHours())
      );
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
     * Returns a list of busy units based
     * on an array of hours.
     *
     * @param {Array} hours list of hours.
     * @return {Array} list of busy units.
     */
    _getBusyUnits: function _getBusyUnits(hours) {
      var set = new Calendar.Set(),
          result = [],
          i = 0,
          unit;

      for (; i < hours.length; i++) {
        unit = this._hourToBusyUnit(hours[i]);
        if (!set.has(unit)) {
          result.push(unit);
          set.add(unit);
        }
      }

      return result;
    },

    _appendBusyUnits: function(dateId, busyUnits) {
      var id = this._dayId(dateId),
          element = document.getElementById(id);

      element = element.querySelector('.busy-indicator');

      element.insertAdjacentHTML(
        'afterbegin',
        this._renderBusyUnits(dateId, busyUnits)
      );
    },

    /**
     * Remove busy units from the dom and registry.
     *
     * TODO: Profile/Optimize
     *
     * @param {String} dateId string/date for dom id.
     */
    _removeBusyUnits: function(dateId, busyUnits) {
      var id = this._dayId(dateId),
          element = document.getElementById(id),
          list, classes = [], i = 0, len, busyEl,
          set = this._busySet(dateId), unit;

      len = busyUnits.length;

      for (i; i < len; i++) {
        unit = busyUnits[i];
        classes.push('.' + this._busyClass(unit));

        if (set) {
          set.delete(unit);
        }
      }

      if (element) {
        list = element.querySelectorAll(classes);
        len = list.length;

        for (i = 0; i < len; i++) {
          busyEl = list[i];
          busyEl.parentNode.removeChild(busyEl);
        }
      }
    },

    /**
     * Returns an html blob of busy units.
     *
     * @param {String} regId register id
     *                       if given will register busy units.
     * @param {Array} units list of units.
     */
    _renderBusyUnits: function _renderBusyUnits(regId, units) {
      var output = '',
          set;

      if (regId) {
        set = this._busySet(regId);
      }

      units.forEach(function(unit) {
        output += template.busy.render(this._busyClass(unit));
        if (set) {
          set.add(unit);
        }
      }, this);

      return output;
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
          units,
          busytimes = this.app.store('Busytime');

      hours = busytimes.getHours(date);
      units = this._getBusyUnits(hours);
      state = Calendar.Calc.relativeState(
        date,
        this.controller.currentMonth
      );

      return template.day.render({
        id: this._dayId(id),
        dateString: id,
        state: state,
        date: date.getDate(),
        busy: this._renderBusyUnits(id, units)
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
