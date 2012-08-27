Calendar.ns('Controllers').Time = (function() {

  function Time(app) {
    this.app = app;
    Calendar.Responder.call(this);
    Calendar.TimeObserver.call(this);

    this._timeCache = {};
    this._timespans = [];
    this._collection = new Calendar.IntervalTree();

    var busytime = this.busytime = app.store('Busytime');
    busytime.on('add time', this);
    busytime.on('remove time', this);
  }

  Time.prototype = {
    __proto__: Calendar.Responder.prototype,
    _position: null,
    _lastTimespan: null,
    _timeCache: null,
    _timespans: null,

    get timespan() {
      return this._timespan;
    },

    get selectedDay() {
      return this._selectedDay;
    },

    set selectedDay(value) {
      var day = this._selectedDay;
      if (!day || !Calendar.Calc.isSameDate(day, value)) {
        this._selectedDay = value;
        this.emit('selectedDayChange', value, day);
      }
    },

    direction: 'future',

    observe: function() {
      this.on(
        'monthChange',
        this._loadMonthSpan.bind(this)
      );
    },

    _updateCache: function(type, value) {
      var old = this._timeCache[type];

      if (!old || !Calendar.Calc.isSameDate(value, old)) {
        this._timeCache[type] = value;
        this.emit(type + 'Change', value, old);
      }
    },

    /**
     * Loads a span of a month.
     * Each time this method is called
     * the same timespan should be generated.
     *
     * XXX: This is going to assume for now
     * that we can't "jump" in time from one
     * month to a totally different one many
     * months in the past/future. So each
     * span is expected to be sequential.
     */
    _loadMonthSpan: function(date) {
      var span = Calendar.Calc.spanOfMonth(date);

      var i = 0;
      var len = this._timespans.length;
      var existing;

      // 0. No spans just add it...
      if (len === 0) {
        // just load the span
        this._timespans.push(span);
        return this.busytime.loadSpan(span);
      }

      // 1. event happens before first event
      var first = this._timespans[0];

      // > rather then >= because we only
      // wish to do this when we don't have
      // not loaded this span previously.
      if (span.start < first.start) {
        this._timespans.splice(0, 0, span);
        this._lastTimespan = span;

        span = first.trimOverlap(span) || span;
        return this.busytime.loadSpan(span);
      }

      var last = this._timespans[len - 1];

      if (span.end > last.end) {
        this._timespans.push(span);
        this._lastTimespan = span;

        span = last.trimOverlap(span) || span;
        return this.busytime.loadSpan(span);
      }
    },

    handleEvent: function(event) {
      var busytime = event.data[0];
      var start = busytime.startDate;
      var end = busytime.endDate;
      var type;

      switch (event.type) {
        case 'add time':
          type = 'add';
          this._collection.add(busytime);
          break;
        case 'remove time':
          type = 'remove';
          this._collection.remove(busytime);
          break;
      }

      if (type) {
        this.fireTimeEvent(
          type, start, end, busytime
        );
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
     * Queries busytimes cache by timespan.
     *
     * @param {Calendar.Timespan} timespan query range.
     * @return {Array} busytimes ordered by start date.
     */
    queryCache: function(timespan) {
      return this._collection.query(timespan);
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
      var day = date.getDate();

      var yearDate = new Date(year, 0, 1);
      var monthDate = new Date(year, month, 1);

      var oldPosition = this._position;
      this._position = date;

      this._updateCache('year', yearDate);
      this._updateCache('month', monthDate);
      this._updateCache('day', date);

      if (oldPosition) {
        if (oldPosition < date) {
          this.direction = 'future';
        } else if (oldPosition > date) {
          this.direction = 'past';
        } else {
          this.direction = 'future';
        }
      }

    }

  };

  Calendar.TimeObserver.enhance(Time.prototype);

  return Time;

}());
