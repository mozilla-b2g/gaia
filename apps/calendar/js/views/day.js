(function(window) {
  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  var format = Calendar.format;

  function Day(options) {
    var key;

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

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

    templates: {
      eventHour: [
        '<section>',
          '<h4>%s</h4>',
          '<ol class="events">',
            '%s',
          '</ol>',
        '</section>'
      ].join(''),

      eventAttendee: [
        '<span class="attendee">%s</span>'
      ].join(' '),

      eventItem: [
        '<li class="event">',
          '<h5>%s</h5>',
          '<span class="details">',
            '<span class="location">',
              '%s',
            '</span>',
            '\n-\n',
            '%s',
          '</span>',
        '</li>'
      ].join(' ')
    },

    headerSelector: '#selected-day-title',
    eventsSelector: '#event-list',

    _initEvents: function() {
      var self = this;

      this.controller.on('selectedDayChange', function() {
        self._updateEvents();
        self._updateHeader();
      });
    },

    eventsElement: function() {
      return getEl.call(this, 'eventsSelector', '_eventsEl');
    },

    headerElement: function() {
      return getEl.call(this, 'headerSelector', '_headerEl');
    },

    _updateHeader: function(date) {
      date = date || this.controller.selectedDay;
      var header = [
        this.dayNames[date.getDay()],
        this.monthNames[date.getMonth()],
        date.getDate()
      ].join(' ');

      //really should not be innerHTML
      this.headerElement().innerHTML = header;
    },

    _renderDay: function(date) {
      var events = this.controller.eventList,
          eventItems = events.eventsForDay(date),
          self = this,
          eventHtml = [],
          groupsByHour = [];

      if (eventItems.length === 0) {
        return '';
      }

      var sorted = eventItems.sort(function(a, b) {
        var aHour = a.date.getHours(),
            bHour = b.date.getHours();

        if (aHour === bHour) {
          return 0;
        }

        if (aHour < bHour) {
          return -1;
        } else {
          return 1;
        }

      });

      var lastHour,
          batch = [];

      sorted.forEach(function(item) {
        var hour = item.date.getHours();

        if (hour != lastHour) {
          lastHour = hour;
          if (batch.length > 0) {
            eventHtml.push(self._renderEventsForHour(batch));
            batch = [];
          }
        }

        batch.push(item);
      });

      eventHtml.push(self._renderEventsForHour(batch));

      return eventHtml.join('');
    },

    _formatHour: function(hour) {
      newHour = hour;
      if (hour > 12) {
        var newHour = (hour - 12) || 12;
        return String(newHour) + ' pm';
      } else {
        if(hour == 0){
          hour = 12;
        }
        return String(hour) + 'am';
      }
    },

    _renderEventsForHour: function(group) {
      var eventHtml = [],
          hour = group[0].date.getHours();

      group.forEach(function(item) {
        eventHtml.push(this._renderEventDetails(item.event));
      }.bind(this));

      return format(
        this.templates.eventHour,
        this._formatHour(hour),
        eventHtml.join('')
      );
    },

    _renderEventDetails: function(object) {
      var name = object.name,
          location = object.location,
          attendees = object.attendees,
          tpl = this.templates.eventItem;

      return format(
        tpl,
        name,
        location || '',
        this._renderAttendees(attendees) || ''
      );
    },

    _renderAttendees: function(list) {
      var tpl = this.templates.eventAttendee;

      if (!(list instanceof Array)) {
        list = [list];
      }

      return list.map(function(item) {
        return format(tpl, item);
      }).join(',');
    },

    _updateEvents: function(date) {
      var date = date || this.controller.selectedDay;
      var html = this._renderDay(date);

      this.eventsElement().innerHTML = html;
    },

    render: function() {
      var now = new Date();
      this._updateHeader(now);
      this._updateEvents(now);
    }

  };

  Calendar.Views.Day = Day;

}(this));
