Calendar.TimeObserver = (function() {

  function TimeObserver() {
    this._timeObservers = [];
  }

  TimeObserver.enhance = function(given) {
    var key;
    var proto = TimeObserver.prototype;
    for (key in proto) {
      if (proto.hasOwnProperty(key)) {
        given[key] = proto[key];
      }
    }
  };

  TimeObserver.prototype = {
   /**
     * Adds observer for timespan.
     *
     * Object example:
     *
     *    object.handleEvent = function(e) {
     *      // e.type
     *      // e.data
     *      // e.time
     *    }
     *
     *    // when given an object
     *    EventStore.observe(timespan, object)
     *
     *
     * Callback example:
     *
     *    EventStore.observe(timespan, function(event) {
     *      // e.type
     *      // e.data
     *      // e.time
     *    });
     *
     * @param {Calendar.Timespan} timespan span to observe.
     * @param {Function|Object} callback function or object follows
     *                                   EventTarget pattern.
     */
    observeTime: function(timespan, callback) {
      if (!(timespan instanceof Calendar.Timespan)) {
        throw new Error(
          'must pass an instance of Calendar.Timespan as first argument'
        );
      }
      this._timeObservers.push([timespan, callback]);
    },

    /**
     * Finds index of timespan/object|callback pair.
     *
     * Used internally and in tests has little practical use
     * unless you have the original timespan object.
     *
     * @param {Calendar.Timespan} timespan original (===) timespan used.
     * @param {Function|Object} callback original callback/object.
     * @return {Numeric} -1 when not found otherwise index.
     */
    findTimeObserver: function(timespan, callback) {
      var len = this._timeObservers.length;
      var idx = null;
      var field;
      var i = 0;

      for (; i < len; i++) {
        field = this._timeObservers[i];

        if (field[0] === timespan &&
            field[1] === callback) {

          return i;
        }
      }

      return -1;
    },

    /**
     * Removes a time observer you
     * must pass the same instance of both
     * the timespan and the callback/object
     *
     *
     * @param {Calendar.Timespan} timespan timespan object.
     * @param {Function|Object} callback original callback/object.
     * @return {Boolean} true when found & removed callback.
     */
    removeTimeObserver: function(timespan, callback) {
      var idx = this.findTimeObserver(timespan, callback);

      if (idx !== -1) {
        this._timeObservers.splice(idx, 1);
        return true;
      } else {
        return false;
      }
    },

    /**
     * Fires a time based event.
     *
     * @param {String} type name of event.
     * @param {Date|Numeric} start start position of time event.
     * @param {Date|Numeric} end end position of time event.
     * @param {Object} data data related to event.
     */
    fireTimeEvent: function(type, start, end, data) {
      var i = 0;
      var len = this._timeObservers.length;
      var observer;
      var event = {
        time: true,
        data: data,
        type: type
      };

      for (; i < len; i++) {
        observer = this._timeObservers[i];
        if (observer[0].overlaps(start, end)) {
          if (typeof(observer[1]) === 'object') {
            observer[1].handleEvent(event);
          } else {
            observer[1](event);
          }
        }
      }
    }
  };

  return TimeObserver;

}());
