Calendar.ns('Views').MultiDay = (function() {
'use strict';

var HourDoubleTap = Calendar.Views.HourDoubleTap;
var Pan = Calendar.Views.Pan;
var SingleDay = Calendar.Views.SingleDay;
var Timespan = Calendar.Timespan;
var View = Calendar.View;
var createDay = Calendar.Calc.createDay;
var localeFormat = Calendar.App.dateFormat.localeFormat;
var throttle = Calendar.Utils.mout.throttle;

function MultiDay(opts) {
  this.app = opts.app;
  this.timeController = opts.app.timeController;
  this.children = [];
  this._render = throttle(this._render, 200);
}

MultiDay.prototype = {

  // override this on child classes to change the behavior!
  scale: 'week',
  visibleCells: 5,
  element: null,

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
    return this.element.querySelector('.days');
  },

  get alldaysHolder() {
    return this.element.querySelector('.alldays');
  },

  get main() {
    return this.element.querySelector('.main');
  },

  get mainContent() {
    return this.element.querySelector('.main-content');
  },

  get sidebar() {
    return this.element.querySelector('.sidebar');
  },

  onactive: function() {
    this.element.classList.add(View.ACTIVE);

    if (!this.seen) {
      this.onfirstseen();
      this.seen = true;
    }

    var controller = this.timeController;
    controller.scale = this.scale;
    controller.moveToMostRecentDay();

    this.baseDate = this._calcBaseDate(controller.position);
    this._render();
    this._resetScroll();
    this._scrollToHour();

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
    // we keep the localized listener even when view is inactive to avoid
    // rebuilding the hours/dates every time we switch between views
    window.addEventListener('localized', this);
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
      ],
      onDragRelease: this._updateBaseDateAfterScroll.bind(this)
    });
    this._pan.setup();
  },

  _setupHours: function() {
    var sidebar = this.sidebar;
    // we need to remove all children because when locale change we rebuild
    // the hours (we can't use data-l10n-id because of special format)
    sidebar.innerHTML = '';
    var hour, i = -1;
    while (++i < 24) {
      hour = this._createHour(i);
      sidebar.appendChild(hour);
    }
    this._hourHeight = hour.offsetHeight;
  },

  _createHour: function(hour) {
    var el = document.createElement('li');
    el.className = 'hour hour-' + hour;
    el.innerHTML = '<span class="display-hour">' +
      this._formatDisplayHour(hour) + '</span>';
    return el;
  },

  _formatDisplayHour: function(hour) {
    var date = new Date();
    date.setHours(hour, 0, 0, 0);
    // we wrap the am/pm with JS because this keeps the locale file simpler and
    // increases the flexibility.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Localization/Localization_best_practices#Avoid_unnecessary_complexity_in_strings
    var format = navigator.mozL10n.get('hour-format')
      .replace(/\s*%p\s*/, '<span class="ampm">%p</span>');
    // remove leading zero
    return localeFormat(date, format).replace(/^0/, '');
  },

  _setupCurrentTime: function() {
    this._currentTime = new Calendar.Views.CurrentTime({
      container: this.element.querySelector('.main-content'),
      sticky: this.alldaysHolder
    });
  },

  _setupDoubleTap: function() {
    this._hourDoubleTap = new HourDoubleTap({
      app: this.app,
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
        this._localize();
        break;
    }
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
    this.timeController.move(day);
    this.timeController.selectedDay = day;
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
    this._pan.refresh();
    this._refreshCurrentTime();
  },

  _refreshCurrentTime: function() {
    this._currentTime.timespan = this._visibleRange;
    this._currentTime.refresh();
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
          hourHeight: this._hourHeight
        });
        day.setup();
        this.children.push(day);
      });
  },

  _getPendingDates: function(range) {
    var dates = range.daysBetween();
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
    var now = new Date();
    var hour;

    if (this._visibleRange.contains(now)) {
      hour = Math.max(now.getHours() - 1, 0);
    } else if (!options || !options.onlyToday) {
      hour = 8;
    }

    if (hour != null) {
      this._animatedScroll(hour * this._hourHeight);
    }
  },

  _animatedScroll: function(scrollTop) {
    var container = this.main;
    var maxScroll = container.scrollHeight - container.clientHeight;

    scrollTop = Math.min(scrollTop, maxScroll);

    var content = this.mainContent;
    var destination = container.scrollTop - scrollTop;
    var seconds = Math.abs(destination) / 500;

    container.style.overflowY = 'hidden';

    window.requestAnimationFrame(() => {
      content.style.transform = 'translateY(' + destination + 'px)';
      // easeOutQuart borrowed from http://matthewlein.com/ceaser/
      content.style.transition = 'transform ' + seconds + 's ' +
        'cubic-bezier(0.165, 0.840, 0.440, 1.000)';
    });

    content.addEventListener('transitionend', function setScrollTop() {
      content.removeEventListener('transitionend', setScrollTop);
      content.style.transform = '';
      content.style.transition = '';
      container.scrollTop = scrollTop;
      container.style.overflowY = 'scroll';
    });
  },

  oninactive: function() {
    this.element.classList.remove(View.ACTIVE);
    this.timeController.removeEventListener('dayChange', this);
    this.children.forEach(child => child.oninactive());
  }
};

function createDayDiff(date, diff) {
  return createDay(date, date.getDate() + diff);
}

return MultiDay;
}());
