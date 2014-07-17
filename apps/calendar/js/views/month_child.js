(function(window) {
  'use strict';

  var Calc = Calendar.Calc,
      debug = Calendar.debug('month child'),
      template = Calendar.Templates.Month;

  // horrible hack to clear cache when we re-localize
  window.addEventListener('localized', function clearHeaderCache() {
    Child._dayHeaders = null;
  });

  function Child() {
    Calendar.View.apply(this, arguments);

    this.id = this.date.valueOf();
    this.controller = this.app.timeController;

    this._days = Object.create(null);
    this._dayToBusyCount = Object.create(null);
    this.timespan = Calc.spanOfMonth(this.date);
  }

  Child.prototype = {
    __proto__: Calendar.View.prototype,

    ACTIVE: 'active',

    hasBeenActive: false,

    //Override parent view...
    get element() {
      return this._element;
    },

    set element(val) {
      this._element = val;
      return val;
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
      var added = [], removed = [];
      switch (event.type) {
        case 'add':
          added.push(event.data);
          break;
        case 'remove':
          removed.push(event.data);
          break;
      }

      this._updateBusytimes({ added: added, removed: removed });
    },

    _updateBusytimes: function(options) {
      if ('added' in options) {
        options.added.forEach(function(busytime) {
          this._updateBusyCount(busytime, 1);
        }, this);
      }

      if ('removed' in options) {
        options.removed.forEach(function(busytime) {
          this._updateBusyCount(busytime, -1);
        }, this);
      }
    },

    _updateBusyCount: function(busytime, difference) {
      var endDate = busytime.endDate;
      var dates = [];
      // Use the last second of previous day as the base for endDate
      // (e.g., 1991-09-14T23:59:59 insteads of 1991-09-15T00:00:00).
      if (endDate.getHours() === 0 &&
          endDate.getMinutes() === 0 &&
          endDate.getSeconds() === 0) {
        endDate = new Date(endDate.getTime() - 1000);
      }

      dates = Calc.daysBetween(
        busytime.startDate,
        endDate
      );

      dates.forEach(function(date) {
        var dayId = Calc.getDayId(date);
        var count = this._dayToBusyCount[dayId];
        this._setBusyCount(dayId, count + difference);
      }, this);
    },

    _setBusyCount: function(dayId, count) {
      this._dayToBusyCount[dayId] = count;

      // Now redraw the busytime dots.
      var element = this._busyElement(dayId);
      if (!element) {
        return debug('Could not find container for ' + dayId + '!');
      }

      var difference = Math.min(3, count) - element.childNodes.length;

      if (difference === 0) {
        return;
      }

      var i = 0;
      if (difference > 0) {
        var dot;
        for (; i < difference; i++) {
          dot = document.createElement('div');
          dot.className = 'gaia-icon icon-calendar-dot';
          element.appendChild(dot);
        }

        return;
      }

      // difference < 0
      for (; i > difference; i--) {
        element.removeChild(element.firstChild);
      }
    },

    /**
     * Finds day element busytime container.
     * Caches over time.
     *
     * @param {String} dayId date id.
     */
    _busyElement: function(dayId) {
      var id = this._dayId(dayId);
      var found = this.element.querySelector('#' + id + ' .busy-indicator');
      this._days[dayId] = found;
      return found;
    },


    /**
     * Renders out a day with busy times.
     *
     * @param {Date} date representing a date.
     */
    _renderDay: function _renderDay(date) {
      var id = Calc.getDayId(date);
      var state = Calc.relativeState(
        date,
        this.date
      );

      // register instance in map
      this._days[id] = null;
      this._dayToBusyCount[id] = 0;

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
          var l10n = 'weekday-' + day + '-single-char';

          name = navigator.mozL10n.get(l10n);
          html += template.weekDaysHeaderDay.render({
            l10n: l10n,
            dayName: name
          });
        }

        Child._dayHeaders = template.weekDaysHeader.render(html);
        return Child._dayHeaders;
      }

      return Child._dayHeaders;
    },

    /**
     * Renders out an entire month.
     *
     * @param {Date} date date which month resides in.
     * @return {String} return value.
     */
    _renderMonth: function _renderMonth() {
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

        if (slice.length) {
          html += this._renderWeek(slice);
        }
      }

      return this._renderDayHeaders() + html;
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
      if (this.hasBeenActive) {
        return;
      }

      Calendar.nextTick(function() {
        var busytimes = this.controller.queryCache(this.timespan);
        this._updateBusytimes({ added: busytimes });
        this._initEvents();
        // at this point the month view should be ready
        Calendar.Performance.monthReady();
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
      var element = document.createElement('section');

      element.classList.add('month');
      element.innerHTML = html;

      this.element = element;

      return element;
    },

    destroy: function() {
      this._destroyEvents();
      this._days = Object.create(null);
      this._dayToBusyCount = Object.create(null);

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
