Calendar.ns('Service').IcalRecurExpansion = {

  /**
   * Maximum iterations must be > 0 && < Infinity.
   * Lower values are probably better as we can show progress
   * for multiple events rather then complete one long recurring
   * event after another...
   */
  forEachLimit: 200,

  _isDone: function(last, sent, max) {
    if (last && max && last.compare(max) >= 0) {
      return true;
    } else if (sent < this.forEachLimit) {
      return false;
    }

    return true;
  },

  /**
   * Iterates through a recur expansion instance.
   * Gracefully handles existing iterators (including failures).
   * Will fallback to complete re-expansion when necessary.
   *
   * NOTE: This method intentionally does not accept the "forEach"
   * function as the final argument to indicate it does not follow
   * the NodeJS example...
   *
   * minDate is always exclusive
   * maxDate is not strict and may include one occurrence beyond.
   *
   * @param {ICAL.Event} event complete event.
   * @param {Null|Object} iterator or nothing.
   * @param {Function} forEach receives [nextDate].
   * @param {ICAL.Time|Null} minDate minimum time (defaults to start).
   * @param {ICAL.Time|Null} maxDate maximum date (defaults to none).
   * @return {ICAL.RecurExpansion} iterator.
   */
  forEach: function(event, iterator, each, min, max) {
    // if there is no iterator create one...
    if (!iterator) {
      return this._beginIteration(event, each, min, max);
    }

    var iter;

    try {
      iter = this._resumeIteration(event, iterator, each, min, max);
    } catch (e) {
      console.log(
        'Iteration Error: ' +
        e.toString()
      );
      iter = this._beginIteration(event, each, min, max);
    }

    return iter;
  },

  _resumeIteration: function(event, iterator, each, min, max) {
    if (!(iterator instanceof ICAL.RecurExpansion)) {
      iterator = new ICAL.RecurExpansion(iterator);
    }

    this._iterate(event, iterator, each, min, max);
    return iterator;
  },

  _beginIteration: function(event, each, min, max) {
    var iterator = event.iterator();
    this._iterate(event, iterator, each, min, max);

    return iterator;
  },

  _iterate: function(event, iterator, each, min, max) {
    // keep track of the iterations
    var sent = 0;
    var current;

    do {
      current = iterator.next();

      if (!current)
        break;

      if (!min || current.compare(min) > 0) {
        // sent should be inside the loop to guard against
        // the possibility that the resume functionality breaking.
        sent++;
        each(current);
      }

    } while (!this._isDone(current, sent, max));
  }
};
