define(function(require, exports, module) {
'use strict';

var Parent = require('view');
var createDay = require('calc').createDay;
var dateFormat = require('date_format');
var dayObserver = require('day_observer');
var isAllDay = require('calc').isAllDay;
var performance = require('performance');
var template = require('templates/month_day_agenda');

function MonthDayAgenda() {
  Parent.apply(this, arguments);
  this._render = this._render.bind(this);
  this.controller = this.app.timeController;
}
module.exports = MonthDayAgenda;

MonthDayAgenda.prototype = {
  __proto__: Parent.prototype,

  date: null,

  selectors: {
    element: '#month-day-agenda',
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

  onactive: function() {
    Parent.prototype.onactive.call(this);
    this.controller.on('selectedDayChange', this);
    this.changeDate(this.controller.selectedDay);
  },

  oninactive: function() {
    Parent.prototype.oninactive.call(this);
    if (this.date) {
      dayObserver.off(this.date, this._render);
    }
    this.controller.removeEventListener('selectedDayChange', this);
    this.date = null;
  },

  changeDate: function(date) {
    // first time view is active the `selectedDay` is null
    date = date || createDay(new Date());

    if (this.date) {
      dayObserver.off(this.date, this._render);
    }
    this.date = date;
    dayObserver.on(this.date, this._render);

    var formatId = 'months-day-view-header-format';
    this.currentDate.textContent = dateFormat.localeFormat(
      date,
      navigator.mozL10n.get(formatId)
    );
    // we need to set the [data-date] and [data-l10n-date-format] because
    // locale might change while the app is still open
    this.currentDate.dataset.date = date;
    this.currentDate.dataset.l10nDateFormat = formatId;
  },

  _render: function(records) {
    // we should always render allday events at the top
    this.events.innerHTML = records.allday.concat(records.basic)
      .map(this._renderEvent, this)
      .join('');

    this.emptyMessage.classList.toggle('active', records.amount === 0);

    performance.monthsDayReady();
  },

  _renderEvent: function(record) {
    var {event, busytime, color} = record;
    var {startDate, endDate} = busytime;

    return template.event.render({
      hasAlarms: !!(event.remote.alarms && event.remote.alarms.length),
      busytimeId: busytime._id,
      color: color,
      title: event.remote.title,
      location: event.remote.location,
      startTime: startDate,
      endTime: endDate,
      isAllDay: isAllDay(this.date, startDate, endDate)
    });
  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'selectedDayChange':
        this.changeDate(e.data[0]);
        break;
    }
  }
};

});
