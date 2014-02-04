(function(window) {
  var template = Calendar.Templates.Month;
  var Calc = Calendar.Calc;

  // horrible hack to clear cache when we re-localize
  window.addEventListener('localized', function clearHeaderCache() {
    Child._dayHeaders = null;
  });

  function Child() {
    Calendar.View.apply(this, arguments);

    this.id = this.date.valueOf();
    this.controller = this.app.timeController;

    this._days = Object.create(null);
    this.timespan = Calc.spanOfMonth(this.date);

    var daysInWeek = Calc.daysInWeek();
  }

  Child.prototype = {
    __proto__: Calendar.View.prototype,

    ACTIVE: 'active',

    hasBeenActive: false,

    busyPrecision: (24 / 12),

    //Override parent view...
    get element() {
      return this._element;
    },

    set element(val) {
      return this._element = val;
    },

    _dayId: function(date) {
      if (date instanceof Date) {
        date = Calc.getDayId(date);
      }

      return 'month-view-' + this.id + '-' + date;
    },

    _initEvents: function() {
      this.controller.observeTime(this.timespan, this);
    },

    _destroyEvents: function() {
      this.controller.removeTimeObserver(this.timespan, this);
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
      var month = Calc.today.getMonth(),
          id = Calc.getDayId(date),
          state,
          units,
          busytimes = this.app.store('Busytime');

      state = Calc.relativeState(
        date,
        this.date
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
      var output = '';

      for (var i = 0, iLen = days.length; i < iLen; i++) {
        output += this._renderDay(days[i]);
      }

      return template.week.render(output);
    },

    /**
     * Renders out the calendar headers.
     *
     * @return {String} returns a list of headers.
     */
    _renderDayHeaders: function _renderDayHeaders() {
      if (!Child._dayHeaders) {
        var i = 0;
        var days = 7;
        var name;
        var html = '';

        for (; i < days; i++) {
          var day = i;
          // localization updates this value
          if (Calendar.Calc.startsOnMonday) {
            // 0 is monday which is 1 in l10n (based on js engine's getDay)
            day += 1;

            // 6th day of the week which Sunday (and 0 in js engine).
            if (day === 7) {
              day = 0;
            }
          }
          var l10n = 'weekday-' + day + '-short';

          name = navigator.mozL10n.get(l10n);
          html += template.weekDaysHeaderDay.render({
            day: String(day),
            dayName: name[0]
          });
        }

        Child._dayHeaders =
          template.weekDaysHeader.render(html);

        return Child._dayHeaders;
      }

      return Child._dayHeaders;
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
        stringId = Calc.getDayId(stringId);
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
      var id = Calc.getDayId(this.date);
      var weekList = [];

      var week = 0;
      var slice;
      var days = this.timespan.daysBetween();
      var daysInWeek = Calc.daysInWeek();
      var numberOfWeeks = days.length / daysInWeek;
      var html = '';

      this.weeks = numberOfWeeks;

      for (week; week <= numberOfWeeks; week++) {
        slice = days.splice(
          0,
          daysInWeek
        );

        if (slice.length)
          html += this._renderWeek(slice);
      }

      return this._renderDayHeaders() + html;
    },

    _calculateBusytime: function(day, busytime) {
      var startSame;
      var record = {
        _id: this.cssClean(busytime._id),
        eventId: busytime.eventId,
        calendarId: busytime.calendarId
      };

      if (Calc.isSameDate(day, busytime.startDate)) {
        startSame = true;
        record.start = this._hourToBusyUnit(
          busytime.startDate.getHours()
        );
      } else {
        startSame = false;
        record.start = 1;
      }

      if (Calc.isSameDate(day, busytime.endDate)) {
        if (!startSame && day.valueOf() === busytime.endDate.valueOf()) {
          return false;
        }

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
      var data = this._calculateBusytime(date, busytime);

      if (data) {
        element.insertAdjacentHTML(
          'afterbegin',
          template.busy.render(data)
        );

        // Remove all text nodes.
        var iterator = document.createNodeIterator(element, 4);
        var node;
        while (node = iterator.nextNode()) {
          node.parentNode.removeChild(node);
        }

        // Count the number of busytimes in the day.
        var children = element.getElementsByTagName('span');
        for (var i = 0; i < Math.min(3, children.length); i++) {
          element.insertAdjacentHTML('afterbegin', '&bull;');
        }
      }
    },

    _renderBusytime: function(busytime) {
      // render out a busytime span
      var span = this.timespan;

      // 1: busytime start/end occurs all on same month/day
      var start = busytime.startDate;
      var end = busytime.endDate;

      if (Calc.isSameDate(start, end)) {
        return this._addBusytime(start, busytime);
      }

      if (busytime.startDate.valueOf() < span.start) {
        start = new Date(span.start);
      }

      if (busytime.endDate.valueOf() > span.end) {
        end = new Date(span.end);
      }

      var days = Calc.daysBetween(
        start,
        end
      );

      var i = 0;
      var len = days.length;
      var day;
      var dayValue;

      for (; i < len; i++) {
        day = days[i];
        dayValue = day.valueOf();

        if (dayValue < this.timespan.start) {
          continue;
        }

        if (dayValue > this.timespan.end) {
          break;
        }

        // Verify that each add is only inside
        // the current timespan.
        this._addBusytime(day, busytime);
      }

    },

    /**
     * Activate this child view visually.
     */
    activate: function() {
      this.element.classList.add(this.ACTIVE);


      /**
       * The first time we "activate" a view we initialize its
       * events and query th cache for related records.
       * We do this async so to minimally effect swipes.
       */
      if (this.hasBeenActive)
        return;

      Calendar.nextTick(function() {
        this.controller.queryCache(this.timespan).forEach(
          this._renderBusytime,
          this
        );

        this._initEvents();
      }.bind(this));

      this.hasBeenActive = true;
    },

    /**
     * Deactivate this child view visually.
     */
    deactivate: function() {
      this.element.classList.remove(this.ACTIVE);
    },

    /**
     * Attaches child view to dom node
     * or object that has a .element.
     *
     * Sets the .element
     *
     * @return {DOMElement} inserted dom node.
     */
    create: function() {
      var html = this._renderMonth();
      var controller = this.controller;
      var element = document.createElement('section');

      element.classList.add('month');
      element.innerHTML = html;

      this.element = element;

      return element;
    },

    destroy: function() {
      this._destroyEvents();
      this._days = Object.create(null);

      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
        this.element = undefined;
      }
    },

    getScrollTop: function() {},

    setScrollTop: function(scrollTop) {}

  };

  Calendar.ns('Views').MonthChild = Child;
}(this));
