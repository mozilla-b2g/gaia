(function(window) {
  var template = Calendar.Templates.Day;

  function Day(options) {
    Calendar.View.apply(this, arguments);

    this.controller = this.app.timeController;
    this.busytime = this.app.store('Busytime');

    this._initEvents();
  }

  function getEl(selectorName, elName) {
    var selector;
    if (!this[elName]) {
      selector = this[selectorName];
      this[elName] = document.body.querySelector(selector);
    }
    return this[elName];
  }

  Day.prototype = {


    __proto__: Calendar.View.prototype,

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
    },

    handleEvent: function(e) {
      switch (e.type) {
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
      ++this._changeToken;

      var endDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1
      );

      var busytime = this.busytime;

      endDate.setMilliseconds(-1);

      if (this._timespan) {
        busytime.removeTimeObserver(
          this._timespan,
          this
        );
      }

      this.currentDate = date;
      this._timespan = new Calendar.Timespan(
        date,
        endDate
      );

      busytime.observeTime(this._timespan, this);

      // clear out all children
      this.events.innerHTML = '';

      this._updateHeader();
      this._loadRecords();
    },

    _loadRecords: function() {
      // find all records for range.
      // if change state is the same
      // then run _renderDay(list)

      var store = this.busytime;

      // keep local record of original
      // token if this changes we know
      // we have switched dates.
      var token = this._changeToken;
      var self = this;

      store.eventsInCachedSpan(this._timespan, function(err, list) {
        if (self._changeToken !== token) {
          // tokens don't match we don't
          // care about these results anymore...
          return;
        }

        self._renderList(list);
      });
    },

    _updateHeader: function() {
      var date = this.currentDate;
      var header = [
        this.dayNames[date.getDay()],
        this.monthNames[date.getMonth()],
        date.getDate()
      ].join(' ');

      this.header.textContent = header;
    },

    _renderList: function(records) {
      // zero based 24 hours in a day;
      var hourStart = new Date(this.currentDate.valueOf());
      var hourEnd = new Date(this.currentDate.valueOf());
      var hourSpan;

      var hour = 0;
      var hours = 23;
      var group;

      // find matching items in the day
      // array that fall within the bounds
      // of the hour. Remove items from the list
      // which end _before_ the current hour.
      function reduce(item, idx) {
        var start = item[0].startDate;
        var end = item[0].endDate;

        if (hourSpan.overlaps(start, end)) {
          group.push(item);
        } else if (end < hourStart) {
          records.splice(idx, 1);
        }
      }

      // iterate through all hours
      for (; hour <= hours; hour++) {
        group = [];
        hourStart.setHours(hour);
        hourEnd.setHours(hour + 1);

        hourSpan = new Calendar.Timespan(
          hourStart,
          hourEnd
        );

        // this will mutate the records
        // for the next run
        records.forEach(reduce, this);

        // we can make this a pref
        // later so we can use this in day
        // view which always renders all hours
        // even if there are no events on a given
        // hour.
        if (group.length) {
          this._renderHour(hour, group);
        }
      }
    },

    /**
     * Renders an hour. Note it is assumed
     * that this function is called in the correct
     * order and does not attempt to order content.
     */
    _renderHour: function(hour, group) {
      var eventHtml = [];

      group.forEach(function(item) {
        eventHtml.push(this._renderEvent(item[1]));
      }, this);

      var html = template.hour.render({
        displayHour: this._formatHour(hour),
        hour: String(hour),
        items: eventHtml.join('')
      });

      this.events.insertAdjacentHTML(
        'beforeend',
        html
      );

    },

    _formatHour: function(hour) {
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
