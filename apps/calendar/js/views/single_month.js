define(function(require, exports, module) {
'use strict';

var Calc = require('calc');
var MonthDay = require('./month_day');
var View = require('view');
var daysBetween = Calc.daysBetween;
var daysInWeek = Calc.daysInWeek;
var getDayId = Calc.getDayId;
var spanOfMonth = Calc.spanOfMonth;

var SELECTED = 'selected';

// SingleMonth contains all the logic required to build the Month view grid and
// groups all the MonthDay instances for that given month.
function SingleMonth() {
  View.apply(this, arguments);
  this.days = [];
  this.timespan = spanOfMonth(this.date);
  this.timeController = this.app.timeController;
}
module.exports = SingleMonth;

SingleMonth.prototype = {
  __proto__: View.prototype,

  active: false,
  container: null,
  date: null,
  days: null,
  element: null,

  create: function() {
    var element = document.createElement('section');
    element.className = 'month';
    element.setAttribute('role', 'grid');
    element.setAttribute('aria-labelledby', 'current-month-year');
    element.setAttribute('aria-readonly', true);
    element.innerHTML = this._renderDayHeaders();
    element.dataset.date = getDayId(this.date);
    this.element = element;
    this._buildWeeks();
  },

  _renderDayHeaders: function() {
    // startDay might change during the 'localized' event
    var startDay = Calc.startDay;
    var days = [];
    var i;
    for (i = startDay; i < 7; i++) {
      days.push(this._dayHeader(i));
    }

    if (startDay > 0) {
      for (i = 0; i < startDay; i++) {
        days.push(this._dayHeader(i));
      }
    }

    var html = `<header id="month-days" role="presentation">
      <ol role="row">${days.join('')}</ol>
    </header>`;
    return html;
  },

  _dayHeader: function(dayIndex) {
    return `<li data-l10n-id="weekday-${dayIndex}-single-char"
      role="columnheader"></li>`;
  },

  _buildWeeks: function() {
    var weekLength = daysInWeek();
    var week;
    daysBetween(this.timespan).forEach((date, i) => {
      if (i % weekLength === 0) {
        week = document.createElement('ol');
        week.setAttribute('role', 'row');
        this.element.appendChild(week);
      }
      var day = new MonthDay({
        date: date,
        month: this.date,
        container: week
      });
      day.create();
      this.days.push(day);
    });
  },

  activate: function() {
    if (this.active) {
      return;
    }
    this.active = true;

    this.onactive();
    this.days.forEach(day => day.activate());
    this._onSelectedDayChange(this.timeController.selectedDay);
    this.timeController.on('selectedDayChange', this);
  },

  deactivate: function() {
    if (!this.active) {
      return;
    }
    this.active = false;

    this.oninactive();
    this.days.forEach(day => day.deactivate());
    this.timeController.off('selectedDayChange', this);
  },

  destroy: function() {
    this.deactivate();
    this._detach();
    this.days.forEach(day => day.destroy());
    this.days = [];
  },

  append: function() {
    this.container.appendChild(this.element);
  },

  _detach: function() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  },

  handleEvent: function(e) {
    if (e.type === 'selectedDayChange') {
      this._onSelectedDayChange(e.data[0]);
    }
  },

  _clearSelectedDay: function() {
    var day = this.element.querySelector(`li.${SELECTED}`);
    if (day) {
      day.classList.remove(SELECTED);
      day.removeAttribute('aria-selected');
    }
  },

  _onSelectedDayChange: function(date) {
    this._clearSelectedDay();

    if (!date || !this.timespan.contains(date)) {
      return;
    }

    var el = this.element.querySelector(`li[data-date="${getDayId(date)}"]`);
    el.classList.add(SELECTED);
    el.setAttribute('aria-selected', true);
    // Put the screen reader cursor onto the selected day.
    el.focus();
  }
};

});
