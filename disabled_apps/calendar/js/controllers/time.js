define(function(require, exports, module) {
'use strict';

// Controls the selected/displayed dates by all the calendar views.
// ---
// All views that needs to listen date selection/navigation changes, or set
// a new value, should do it through this module (eg. day/week/month views and
// DayObserver)

var isSameDate = require('common/calc').isSameDate;
var Responder = require('common/responder');

function Time() {
  Responder.call(this);

  this._timeCache = Object.create(null);
}
module.exports = Time;

Time.prototype = {
  __proto__: Responder.prototype,

  /**
   * Current position in time.
   * Includes year, month and day.
   *
   * @type {Date}
   */
  _position: null,

  /**
   * Current center point of cached
   * time spans. This is not the last
   * loaded timespan but the last
   * requested timespan.
   *
   * @type {Calendar.Timespan}
   */
  _currentTimespan: null,

  /**
   * Hash that contains
   * the pieces of the current _position.
   * (month, day, year)
   */
  _timeCache: null,

  /**
   * The time 'scale' of the current
   * state of the calendar.
   *
   * Usually one of: ['day', 'month', 'week']
   * @type {String}
   */
  _scale: null,

  /**
   * private state of mostRecentDayType
   */
  _mostRecentDayType: 'day',

  /**
   * When true will lock the cache so no records are
   * purged. This is critical during sync because some
   * records may not yet be in the database.
   */
  cacheLocked: false,

  /**
   * Returns the most recently changed
   * day type either 'day' or 'selectedDay'
   */
  get mostRecentDayType() {
    return this._mostRecentDayType;
  },

  get mostRecentDay() {
    if (this.mostRecentDayType === 'selectedDay') {
      return this.selectedDay;
    } else {
      return this.position;
    }
  },

  get timespan() {
    return this._currentTimespan;
  },

  get scale() {
    return this._scale;
  },

  set scale(value) {
    var oldValue = this._scale;
    if (value !== oldValue) {
      this._scale = value;
      this.emit('scaleChange', value, oldValue);
    }
  },

  get selectedDay() {
    return this._selectedDay;
  },

  set selectedDay(value) {
    var day = this._selectedDay;
    this._mostRecentDayType = 'selectedDay';
    if (!day || !isSameDate(day, value)) {
      this._selectedDay = value;
      this.emit('selectedDayChange', value, day);
    }
  },

  /**
   * Helper function to 'move' state of calendar
   * to the most recently modified day type.
   *
   * (in the case where selectedDay was changed after day)
   */
  moveToMostRecentDay: function() {
    if (this.mostRecentDayType === 'selectedDay') {
      this.move(this.selectedDay);
    }
  },

  _updateCache: function(type, value) {
    var old = this._timeCache[type];

    if (!old || !isSameDate(value, old)) {
      this._timeCache[type] = value;
      this.emit(type + 'Change', value, old);
    }
  },

  get month() {
    return this._timeCache.month;
  },

  get day() {
    return this._timeCache.day;
  },

  get year() {
    return this._timeCache.year;
  },

  get position() {
    return this._position;
  },

  /**
   * Sets position of controller
   * in time.
   *
   * @param {Date} date position to move to.
   */
  move: function(date) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var yearDate = new Date(year, 0, 1);
    var monthDate = new Date(year, month, 1);

    this._position = date;
    this._mostRecentDayType = 'day';

    this._updateCache('year', yearDate);
    this._updateCache('month', monthDate);
    this._updateCache('day', date);
  }
};

});
