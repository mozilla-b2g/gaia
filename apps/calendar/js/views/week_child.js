Calendar.ns('Views').WeekChild = (function() {

  var template = Calendar.Templates.Week;
  var OrderedMap = Calendar.OrderedMap;

  function Week(options) {
    Calendar.Views.DayBased.apply(this, arguments);

    this.controller = this.app.timeController;
  }

  Week.prototype = {

    __proto__: Calendar.Views.DayBased.prototype,

    renderAllHours: true,

    get element() {
      return this._element;
    },

    get events() {
      return this._eventsElement;
    },

    /**
     * Signifies the state of view.
     * We increment the change token
     * each time we switch days.
     *
     * This can be used to avoid race conditions
     * by storing a reference to the token locally
     * then comparing it with the global state of
     * the view.
     */
    _changeToken: 0,

    handleEvent: function(e) {
      switch (e.type) {
        case 'remove':
          this.remove(e.data);
          break;
        case 'add':
          this._loadRecords(e.data);
          break;
      }
    },

    activate: function() {
      this.element.classList.add(
        this.activeClass
      );
    },

    deactivate: function() {
      this.element.classList.remove(
        this.activeClass
      );
    },

    _removeTimespanObserver: function() {
      if (this.timespan) {
        this.controller.removeTimeObserver(
          this.timespan,
          this
        );
      }
    },

    /**
     * Changes the date the view cares about
     * in reality we only manage one view at
     * a time.
     *
     * @param {Date} date used to calculate events & range.
     */
    changeDate: function(date) {
      this._resetHourCache();

      ++this._changeToken;

      var controller = this.controller;

      this._removeTimespanObserver();
      this.id = date.valueOf();
      this.date = Calendar.Calc.createDay(date);
      this.timespan = Calendar.Calc.spanOfDay(date);

      controller.observeTime(this.timespan, this);

      // clear out all children
      this.events.innerHTML = '';

      this._loadRecords(this.controller.queryCache(
        this.timespan
      ));
    },

    /**
     * Starts the process of loading records for display.
     *
     * @param {Object|Array} busytimes list or single busytime.
     */
    _loadRecords: function(busytimes) {
      // find all records for range.
      // if change state is the same
      // then run _renderDay(list)
      var store = this.app.store('Event');

      // keep local record of original
      // token if this changes we know
      // we have switched dates.
      var token = this._changeToken;
      var self = this;

      store.findByAssociated(busytimes, function(err, list) {
        if (self._changeToken !== token) {
          // tokens don't match we don't
          // care about these results anymore...
          return;
        }

        list.forEach(function(pair) {
          this.add(pair[0], pair[1]);
        }, self);
      });
    },

    _insertElement: function(html, element, records, idx) {
      var el;
      var len = records.length;

      if (idx === 0) {
        element.insertAdjacentHTML(
          'afterbegin', html
        );
        el = element.firstChild;
      } else {
        var lastElement = records[idx - 1][1];
        lastElement.element.insertAdjacentHTML(
          'afterend', html
        );
        el = lastElement.element.nextElementSibling;
      }

      return el;
    },

    _insertRecord: function(hour, busytime, event) {
      hour = this.hours.get(hour);
      var records = hour.records;

      var len = records.length;
      var idx = records.insertIndexOf(busytime._id);

      var html = this._renderEvent(event);
      var eventArea = hour.element.querySelector(
        template.hourEventsSelector
      );

      var el = this._insertElement(
        html, eventArea, records.items, idx
      );

      var calendarId = this.calendarId(busytime);
      hour.flags.push(calendarId);
      hour.element.classList.add(calendarId);

      return { element: el };
    },

    _removeRecord: function(busytime) {
      var fn = Calendar.Views.DayBased.prototype._removeRecord;

      fn.call(this, busytime, function(id, hour, hourNumber) {
        var calendarClass = this.calendarId(busytime);

        var flags = hour.flags;
        var record = hour.records.get(id);
        var el = record.element;

        // handle flags
        // we need to remove them from the list
        // then check again to see if there
        // are any more...
        var idx = flags.indexOf(calendarClass);

        if (idx !== -1)
          flags.splice(idx, 1);

        // if after we have removed the flag there
        // are no more we can remove the class
        // from the element...
        if (flags.indexOf(calendarClass) === -1) {
          hour.element.classList.remove(calendarClass);
        }

        el.parentNode.removeChild(el);

        // if length is one then we are just
        // about to delete this record so its
        // the last one.
        if (hour.records.length === 1) {
          this.removeHour(hourNumber);
        }
      });
    },

    /**
     * Renders out the calendar headers.
     *
     * @return {String} returns a list of headers.
     */
    _renderDayHeaders: function _renderDayHeaders() {
        var i = 0;
        var days = 7;
        var name;
        var html = '';

        for (; i < days; i++) {
          name = navigator.mozL10n.get('weekday-' + i + '-short');
          html += template.weekDaysHeaderDay.render({
            day: String(i),
            dayName: name,
            //TODO
            dayNumber: 0
          });
        }

      return template.weekDaysHeader.render(html);
    },

    _renderDay: function _renderDay(day) {
      var dayhours = [];
      var hour = 0;
      var name = navigator.mozL10n.get('weekday-' + day + '-short');
      dayhours.push(
        template.weekDaysHeaderDay.render({
          day: String(day),
          dayName: name,
          dayNumber: this._getDayNumber(day)
        })
      );
      for (; hour < 24; hour++) {
        dayhours.push(template.hour.render({
          hour: String(hour)
        }));
      }

      return template.day.render(dayhours.join(''));

    },

    _getDayNumber: function _getDayNumber(number) {
      var firstWeekday = this.date;
      var day = firstWeekday.getDay();

      if (day !== 0) {
        firstWeekday.setHours(-24 * day);
      }

      return firstWeekday.getDate() + number;
    },

    _renderWeek: function _renderWeek() {
      var day = 0;
      var week = [];

      for (; day < 7; day++) {
        week.push(this._renderDay(day));
      }

      return week.join('');
    },

    _renderSidebar: function _renderSidebar() {
      var hours = [];
      var hour = 0;
      hours.push(template.hourSidebarElement.render({
        hour: this._formatHour('allday')
      }));

      for (; hour < 24; hour++) {
        hours.push(template.hourSidebarElement.render({
          hour: this._formatHour(String(hour))
        }));
      }

      return template.hourSidebar.render(hours.join(''));
    },

    /**
     * Creates and returns
     *
     */
    create: function() {
      var html = this._renderSidebar() + this._renderWeek();
      var element = document.createElement('section');

      element.id = this.id;
      element.classList.add('week-events');
      element.innerHTML = html;

      this._element = element;

      return element;
    },

    /**
     * Remove observers and remove elements
     * from the dom.
     */
    destroy: function() {
      this._removeTimespanObserver();
      var el = this.element;

      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  };

  return Week;

}(this));
