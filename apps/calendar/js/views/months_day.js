Calendar.ns('Views').MonthsDay = (function() {
  'use strict';

  var Parent = Calendar.Views.DayChild,
      template = Calendar.Templates.MonthsDay;

  function MonthsDay() {
    Parent.apply(this, arguments);
  }

  MonthsDay.prototype = {
    __proto__: Parent.prototype,

    renderAllHours: false,

    selectors: {
      element: '#months-day-view',
      events: '.day-events',
      currentDate: '#event-list-date',
      emptyMessage: '#empty-message'
    },

    get element() {
      return this._findElement('element');
    },

    get events() {
      return this._findElement('events');
    },

    get currentDate() {
      return this._findElement('currentDate');
    },

    get emptyMessage() {
      return this._findElement('emptyMessage');
    },

    get allDayElement() {
      return this.events;
    },

    changeDate: function(date) {
      Parent.prototype.changeDate.apply(this, arguments);
      this.currentDate.innerHTML = Calendar.App.dateFormat.localeFormat(
        date,
        navigator.mozL10n.get('months-day-view-header-format')
      );

      var children = this.events.children;
      this.emptyMessage.classList.toggle(
        'active',
        !children || children.length === 0
      );
    },

    _initEvents: function() {
      this.controller.on('selectedDayChange', this);
      this.delegate(this.events, 'click', '[data-id]', function(e, target) {
        Calendar.App.router.show('/event/show/' + target.dataset.id + '/');
      });
    },

    /**
     * Overriddes Calendar.Views.DayChild#_renderEvent so that we can use
     * our own event template which has diverged from the default day event.
     */
    _renderEvent: function(busytime, event, hour) {
      var attendees;
      var classes;

      if (event.remote.alarms && event.remote.alarms.length) {
        classes = 'has-alarms';
      }

      if (event.remote.attendees) {
        attendees = this._renderAttendees(
          event.remote.attendees
        );
      }

      return template.event.render({
        classes: classes,
        busytimeId: busytime._id,
        calendarId: event.calendarId,
        title: event.remote.title,
        location: event.remote.location,
        attendees: attendees,
        startTime: Calendar.App.dateFormat.localeFormat(
          busytime.startDate, navigator.mozL10n.get('shortTimeFormat')),
        endTime: Calendar.App.dateFormat.localeFormat(
          busytime.endDate, navigator.mozL10n.get('shortTimeFormat')),
        isAllDay: hour === Calendar.Calc.ALLDAY
      });
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(this, arguments);

      switch (e.type) {
        case 'selectedDayChange':
          this.changeDate(e.data[0], true);
          break;
      }
    },

    add: function() {
      Parent.prototype.add.apply(this, arguments);

      // If we were showing "No Events" before,
      // we should remove it now.
      this.emptyMessage.classList.remove('active');
    },

    remove: function() {
      Parent.prototype.remove.apply(this, arguments);
      // If the only event today was just removed,
      // we should add the "No Events" label.
      var children = this.events.children;
      if (!children || children.length === 0) {
        this.emptyMessage.classList.add('active');
      }
    },

    render: function() {
      this._initEvents();
      var date = Calendar.Calc.createDay(new Date());
      this.changeDate(date);
    }
  };

  MonthsDay.prototype.onfirstseen = MonthsDay.prototype.render;

  return MonthsDay;
}());
