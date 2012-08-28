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
    _currentTimespan: null,
    _timeCache: null,
    _timespans: null,
    _maxTimespans: 6,

    pending: 0,
    loading: false,

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

    _checkCache: function() {
      var dir = this.direction;
      var spans = this._timespans;
      var len = spans.length;
      var max = this._maxTimespans;

      if (len > max) {
        var idx = Calendar.binsearch.find(
          spans,
          this._currentTimespan,
          Calendar.compareByStart
        );

        var isFuture = (dir === 'future');
        var start = idx;
        var end = idx;

        if (isFuture) {
          if ((idx - 1) >= 0) {
            start -= 1;
          }

          while (max-- && end < len) {
            end += 1;
          }

          if (max) {
            start -= max;
          }

        } else {
          if ((end + 1) < len) {
            end += 1;
          }

          while (max-- && start > 0) {
            start -= 1;
          }

          if (max) {
            end += max;
          }

        }

        // reduce the current list to just what we need
        this._timespans = spans.splice(start, end);

        spans.forEach(function(range) {
          this.fireTimeEvent(
            'purge', range.start, range.end, range
          );
        }, this);
      }
    },

    _checkLoadingComplete: function() {
      if (!(--this.pending)) {
        this.loading = false;
        this._checkCache();
        this.emit('loadingComplete');
      }
    },

    _recordSpanChange: function(idx, span) {
      var spans = this._timespans;
      var loadSpan = span;

      // 1. lower bound trim
      if (spans[idx - 1]) {
        loadSpan = spans[idx - 1].trimOverlap(loadSpan);
      }

      // 2. upper bound trim
      if (spans[idx + 1]) {
        loadSpan = spans[idx + 1].trimOverlap(loadSpan);
      }

      loadSpan = loadSpan || span;

      ++this.pending;
      this.loading = true;

      this.busytime.loadSpan(
        loadSpan,
        this._checkLoadingComplete.bind(this)
      );
    },

    /**
     * Loads the initial timespans
     * required for user to interact with
     * the calendar based on a start
     * date. This is called on the first
     * move of the calendar.
     *
     * Loads spans in the follow order:
     *
     * 1. current month
     * 2. next month
     * 3. past month
     *
     * @param {Date} date start point of busytimes to load.
     *                    Expected to be the first of a given
     *                    month.
     */
    _loadInitialSpans: function(date) {
      var getSpan = Calendar.Calc.spanOfMonth;

      var pastSpan = getSpan(new Date(
        date.getFullYear(),
        date.getMonth() - 1,
        1
      ));

      var presentSpan = getSpan(date);
      var futureSpan = getSpan(
         new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1
        )
      );

      this._timespans = [
        pastSpan,
        presentSpan,
        futureSpan
      ];

      // order is important
      // we want to load the busytimes
      // in order of importance to the users
      // initial view of the calendar app.
      //
      // 1. current span.
      // 2. next span
      // 3. previous span.
      this._recordSpanChange(null, presentSpan);
      this._recordSpanChange(2, futureSpan);
      this._recordSpanChange(0, pastSpan);
    },

    /**
     * Loads a span of a month.
     * Each time this method is called
     * the same timespan should be generated.
     */
    _loadMonthSpan: function(date) {
      var len = this._timespans.length;

      var spanOfMonth = Calendar.Calc.spanOfMonth;
      this._currentTimespan = spanOfMonth(date);

      // 0. No spans just add it...
      if (!len) {
        return this._loadInitialSpans(date);
      }

      // determine which direction we need load.
      var month = date.getMonth();
      var isFuture = this.direction === 'future';

      if (isFuture) {
        month += 1;
      } else {
        month -= 1;
      }

      var spans = this._timespans;
      var monthSpan = spanOfMonth(
        new Date(
          date.getFullYear(),
          month,
          1
        )
      );

      // check if already in span
      var find = Calendar.binsearch.find;
      var insert = Calendar.binsearch.insert;

      var idx = find(spans, monthSpan, Calendar.compareByStart);
      if (idx !== null) {
        // already loaded
        return;
      }

      var idx = Calendar.binsearch.insert(
        spans,
        monthSpan,
        Calendar.compareByStart
      );

      spans.splice(idx, 0, monthSpan);
      return this._recordSpanChange(idx, monthSpan);
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

      if (oldPosition) {
        if (oldPosition < date) {
          this.direction = 'future';
        } else if (oldPosition > date) {
          this.direction = 'past';
        } else {
          this.direction = 'future';
        }
      }

      this._updateCache('year', yearDate);
      this._updateCache('month', monthDate);
      this._updateCache('day', date);

    }

  };

  Calendar.TimeObserver.enhance(Time.prototype);

  return Time;

}());
