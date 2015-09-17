define(function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var CurrentTime = require('./current_time');
var HourDoubleTap = require('./hour_double_tap');
var Pan = require('./pan');
var SingleDay = require('./single_day');
var Timespan = require('common/timespan');
var View = require('view');
var animatedScroll = require('utils/animated_scroll');
var core = require('core');
var createDay = require('common/calc').createDay;
var template = require('templates/multi_day');
var throttle = require('ext/mout').throttle;

function MultiDay(opts) {
  this.children = [];
  this._render = throttle(this._render, 200);
}
module.exports = MultiDay;

MultiDay.prototype = {

  // override these properties on child classes to change the behavior!
  scale: 'week',
  visibleCells: 5,
  element: null,
  _hourFormat: 'hour-format',
  _oneDayLabelFormat: 'event-one-day-duration',
  _addAmPmClass: false,

  childClass: SingleDay,
  children: null,
  seen: false,
  _baseDate: null,
  _hourHeight: 0,
  _prevRange: null,
  _visibleRange: null,

  set baseDate(date) {
    // it's very important that base date doesn't hold hour info otherwise we
    // could create duplicate days (because range wouldn't contain datetime)
    this._baseDate = createDay(date);
  },

  get baseDate() {
    return this._baseDate;
  },

  get daysHolder() {
    return this.element.querySelector('.md__days');
  },

  get alldaysHolder() {
    return this.element.querySelector('.md__alldays');
  },

  get main() {
    return this.element.querySelector('.md__main');
  },

  get mainContent() {
    return this.element.querySelector('.md__main-content');
  },

  get sidebar() {
    return this.element.querySelector('.md__sidebar');
  },

  get allDayIcon() {
    return this.element.querySelector('.md__all-day');
  },

  onactive: function() {
    this.element.classList.add(View.ACTIVE);

    if (!this.seen) {
      this.onfirstseen();
      this.seen = true;
    }

    var controller = core.timeController;
    controller.scale = this.scale;
    controller.moveToMostRecentDay();

    var previousBaseDate = this.baseDate;
    this.baseDate = this._calcBaseDate(controller.position);
    this._render();

    if (window.history.state && 'eventStartHour' in window.history.state) {
      // scroll to last edited event
      this._scrollToHour({
        hour: Math.max(window.history.state.eventStartHour - 1, 0)
      });
    } else if (!(previousBaseDate &&
                 Calc.isSameDate(previousBaseDate, this.baseDate))) {
      // Do not scroll when come back from other time views without changing the
      // base date
      this._resetScroll();
      this._scrollToHour();
    }

    // add listeners afterwards to avoid calling render twice
    controller.on('dayChange', this);
  },

  _calcBaseDate: function(date) {
    // this is overwritten by week view, and only called during onactivate
    return date;
  },

  onfirstseen: function() {
    this._setupPan();
    this._setupHours();
    this._setupCurrentTime();
    this._setupDoubleTap();
    this.allDayIcon.id = 'md__all-day-icon-' + this.scale;
    // we keep the localized listener even when view is inactive to avoid
    // rebuilding the hours/dates every time we switch between views
    window.addEventListener('localized', this);
    window.addEventListener('timeformatchange', this);
    // When screen reader is used, scrolling is done using wheel events.
    this.element.addEventListener('wheel', this);
  },

  _setupPan: function() {
    var containerWidth = this.daysHolder.parentNode.offsetWidth;
    this._pan = new Pan({
      gridSize: Math.round(containerWidth / this.visibleCells),
      visibleCells: this.visibleCells,
      eventTarget: this.element,
      overflows: [
        this.main
      ],
      targets: [
        this.alldaysHolder,
        this.daysHolder
      ]
    });
    this._pan.setup();
    this._pan.on('start', () => this._hourDoubleTap.removeAddEventLink());
    this._pan.on('release', obj => this._updateBaseDateAfterScroll(obj.diff));
  },

  _setupHours: function() {
    var sidebar = this.sidebar;
    // we need to remove all children because when locale change we rebuild
    // the hours (we can't use data-l10n-id because of special format)
    sidebar.innerHTML = '';
    var i = -1, hours = '';
    while (++i < 24) {
      hours += template.hour.render({
        hour: i,
        format: this._hourFormat,
        addAmPmClass: this._addAmPmClass
      });
    }
    sidebar.innerHTML = hours;
    this._hourHeight = sidebar.querySelector('.md__hour').offsetHeight;
  },

  _setupCurrentTime: function() {
    this._currentTime = new CurrentTime({
      container: this.mainContent,
      sticky: this.alldaysHolder
    });
  },

  _setupDoubleTap: function() {
    this._hourDoubleTap = new HourDoubleTap({
      main: this.main,
      daysHolder: this.daysHolder,
      alldaysHolder: this.alldaysHolder,
      hourHeight: this._hourHeight
    });
    this._hourDoubleTap.setup();
  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'dayChange':
        this._onDayChange(e.data[0]);
        break;
      case 'localized':
      case 'timeformatchange':
        this._localize();
        break;
      case 'wheel':
        this._onwheel(e);
        break;
    }
  },

  _onwheel: function(event) {
    if (event.deltaMode !== event.DOM_DELTA_PAGE || event.deltaX === 0) {
      return;
    }
    // Update dates based on the number of visible cells after screen reader
    // wheel.
    this._updateBaseDateAfterScroll(event.deltaX * this.visibleCells);
  },

  _onDayChange: function(date) {
    // _render() updates the _visibleRange, so we need to check it first
    var containedToday = this._visibleRange.contains(new Date());
    this.baseDate = date;
    this._render();
    if (!containedToday) {
      this._scrollToHour({ onlyToday: true });
    }
  },

  _localize: function() {
    this._setupHours();
    this._refreshCurrentTime();
  },

  _updateBaseDateAfterScroll: function(diff) {
    var day = createDayDiff(this.baseDate, diff);
    core.timeController.move(day);
    core.timeController.selectedDay = day;
  },

  _render: function() {
    var currentRange = this._getRange();
    this._removeDatesOutsideRange(currentRange);

    // very important to re-activate child views in case we change views
    // without moving to a different date
    this.children.forEach(child => child.onactive());

    this._addDatesInsideRange(currentRange);

    this._prevRange = currentRange;
    this._visibleRange = this._getVisibleRange();
    this._sortDays();
    this._setVisibleForScreenReader();
    this._pan.refresh();
    this._refreshCurrentTime();
  },

  _refreshCurrentTime: function() {
    this._currentTime.timespan = this._visibleRange;
    this._currentTime.refresh();
  },

  _setVisibleForScreenReader: function() {
    this.children.forEach(
      child => child.setVisibleForScreenReader(this._visibleRange));
  },

  _removeDatesOutsideRange: function(range) {
    if (this.children.length) {
      this.children = this.children.filter(child => {
        if (range.contains(child.date)) {
          return true;
        }
        child.destroy();
        return false;
      });
    }
  },

  _addDatesInsideRange: function(range) {
    this._getPendingDates(range)
      .forEach(date => {
        var day = new this.childClass({
          date: date,
          daysHolder: this.daysHolder,
          alldaysHolder: this.alldaysHolder,
          allDayIcon: this.allDayIcon,
          hourHeight: this._hourHeight,
          oneDayLabelFormat: this._oneDayLabelFormat
        });
        day.setup();
        this.children.push(day);
      });
  },

  _getPendingDates: function(range) {
    var dates = Calc.daysBetween(range);
    if (this._prevRange) {
      dates = dates.filter(date => {
        return !this._prevRange.contains(date);
      });
    }
    return dates;
  },

  _sortDays: function() {
    // decided to use float and reappend the elements in the right order
    // since using position:absolute or css transforms felt "slower"
    // (we have a reflow anyway since we might add new elements to the DOM)
    this.children
      .sort((a, b) => a.date - b.date)
      .forEach(day => day.append());
  },

  _getRange: function() {
    return new Timespan(
      createDayDiff(this.baseDate, -this.visibleCells),
      createDayDiff(this.baseDate, (this.visibleCells * 2) - 1)
    );
  },

  _getVisibleRange: function() {
    return new Timespan(
      this.baseDate,
      createDayDiff(this.baseDate, this.visibleCells)
    );
  },

  _resetScroll: function() {
    this.main.scrollTop = 0;
  },

  _scrollToHour: function(options) {
    var hour = this._getScrollDestinationHour(options);
    if (hour != null) {
      animatedScroll({
        content: this.mainContent,
        container: this.main,
        scrollTop: hour * this._hourHeight
      });
    }
  },

  _getScrollDestinationHour: function(options) {
    var hour = options && options.hour;
    if (hour != null) {
      return hour;
    }

    var now = new Date();
    if (this._visibleRange.contains(now)) {
      return Math.max(now.getHours() - 1, 0);
    }

    return (options && options.onlyToday) ? null : 8;
  },

  oninactive: function() {
    this.element.classList.remove(View.ACTIVE);
    core.timeController.removeEventListener('dayChange', this);
    this.children.forEach(child => child.oninactive());
  }
};

function createDayDiff(date, diff) {
  return createDay(date, date.getDate() + diff);
}

});
