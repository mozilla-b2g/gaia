define(function(require, exports, module) {
'use strict';

var Calc = require('calc');
var Parent = require('./day_child');
var template = require('templates/months_day');
var app = require('app');
var dateFormat = require('date_format');

function MonthsDay() {
  Parent.apply(this, arguments);
}
module.exports = MonthsDay;

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
    var formatId = 'months-day-view-header-format';
    this.currentDate.textContent = dateFormat.localeFormat(
      date,
      navigator.mozL10n.get(formatId)
    );
    // we need to set the [data-date] and [data-l10n-date-format] because
    // locale might change while the app is still open
    this.currentDate.dataset.date = date;
    this.currentDate.dataset.l10nDateFormat = formatId;
    this._toggleEmptyMessage();
  },

  _toggleEmptyMessage: function() {
    var children = this.events.children;
    this.emptyMessage.classList.toggle(
      'active',
      !children || children.length === 0
    );
  },

  _initEvents: function() {
    this.controller.on('selectedDayChange', this);
    this.delegate(this.events, 'click', '[data-id]', function(e, target) {
      app.router.show('/event/show/' + target.dataset.id + '/');
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
      startTime: busytime.startDate,
      endTime: busytime.endDate,
      isAllDay: hour === Calc.ALLDAY
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
    this._toggleEmptyMessage();
  },

  remove: function() {
    Parent.prototype.remove.apply(this, arguments);
    this._toggleEmptyMessage();
  },

  render: function() {
    this._initEvents();
    var date = Calc.createDay(new Date());
    this.changeDate(date);
  },

  onfirstseen: function() {
    // this avoids a race condition where events from hidden calendars would
    // show up on first load
    this.app.store('Calendar').all(() => this.render());
  }
};

});
