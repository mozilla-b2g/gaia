(function(window) {
  var template = Calendar.Templates.Day;
  var OrderedMap = Calendar.Views.DayBased.OrderedMap;

  function Day(options) {
    Calendar.Views.DayBased.apply(this, arguments);

    this.controller = this.app.timeController;
    this._initEvents();
  }

  Day.prototype = {

    __proto__: Calendar.Views.DayBased.prototype,

    selectors: {
      element: '#months-day-view',
      events: '#months-day-view .day-events',
      header: '#months-day-view .day-title'
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

    /**
     * Hack this should be localized.
     */
    dayNames: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
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

    _initEvents: function() {
      var self = this;
      this.controller.on('selectedDayChange', this);
      this.events.addEventListener('click', function(e) {
        var target = e.target;
        while (!target.isEqualNode(self.events)) {
          if (target.classList.contains('event')) {
            Calendar.App.router.show('/event/' + target.dataset.id);
            break;
          }
          target = target.parentNode;
        }
      });
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'remove':
          this.remove(e.data);
          break;
        case 'add':
          this._loadRecords(e.data);
          break;
        case 'selectedDayChange':
          this.changeDate(e.data[0]);
          break;
      }
    },

    get header() {
      return this._findElement('header');
    },

    get events() {
      return this._findElement('events');
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

      var endDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1
      );

      var controller = this.controller;

      endDate.setMilliseconds(-1);

      if (this.timespan) {
        controller.removeTimeObserver(
          this.timespan,
          this
        );
      }

      this.date = date;
      this.timespan = new Calendar.Timespan(
        date,
        endDate
      );

      controller.observeTime(this.timespan, this);

      // clear out all children
      this.events.innerHTML = '';

      this._updateHeader();
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

    _updateHeader: function() {
      var date = this.date;
      var header = [
        this.dayNames[date.getDay()],
        this.monthNames[date.getMonth()],
        date.getDate()
      ].join(' ');

      this.header.textContent = header;
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

    _removeHour: function(hour) {
      var record = this.hours.get(hour);
      var el = record.element;
      el.parentNode.removeChild(el);
    },

    _insertHour: function(hour) {
      this.hours.indexOf(hour);

      var len = this.hours.items.length;
      var idx = this.hours.insertIndexOf(hour);

      var html = template.hour.render({
        displayHour: this._formatHour(hour),
        hour: String(hour)
      });

      var el = this._insertElement(
        html,
        this.events,
        this.hours.items,
        idx
      );

      return {
        element: el,
        records: new OrderedMap(),
        flags: []
      };
    },

    _formatHour: function(hour) {
      if (hour === Calendar.Calc.ALLDAY) {
        //XXX: Localize
        return Calendar.Calc.ALLDAY;
      }

      newHour = hour;
      if (hour > 12) {
        var newHour = (hour - 12) || 12;
        return String(newHour) + ' pm';
      } else {
        if (hour == 0) {
          hour = 12;
        }
        return String(hour) + 'am';
      }
    },

    _renderEvent: function(object) {
      var remote = object.remote;
      var attendees;

      if (object.remote.attendees) {
        attendees = this._renderAttendees(
          object.remote.attendees
        );
      }

      return template.event.render({
        eventId: object._id,
        calendarId: object.calendarId,
        title: remote.title,
        location: remote.location,
        attendees: attendees
      });
    },

    _renderAttendees: function(list) {
      if (!(list instanceof Array)) {
        list = [list];
      }

      return template.attendee.renderEach(list).join(',');
    },

    render: function() {
      this.changeDate(new Date());
    }

  };

  Day.prototype.onfirstseen = Day.prototype.render;

  Calendar.ns('Views').MonthsDay = Day;

}(this));
