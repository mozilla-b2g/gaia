(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Store) === 'undefined') {
    Calendar.Store = {};
  }

  function Events() {
    Calendar.Responder.call(this);

    this.ids = {};
    this.times = {};
  }

  var proto = Events.prototype = Object.create(
    Calendar.Responder.prototype
  );

  /**
   * Adds an event object by date and id.
   *
   * @param {String} id unique identifier for busy time.
   * @param {Date} date time to add.
   * @param {Object} object to store.
   */
  proto.add = function(date, id, object) {
    //don't check for uniqueness
    var dateId = Calendar.Calc.getDayId(date);

    if (!(dateId in this.times)) {
      this.times[dateId] = {};
    }

    this.times[dateId][id] = true;
    this.ids[id] = { event: object, date: date };

    this.emit('add', id, this.get(id));
  };

  /**
   * Finds busy time based on its id
   *
   * @param {String} id busy time id.
   */
  proto.get = function(id) {
    return this.ids[id];
  };

  /**
   * Returns an array of events for date.
   *
   * @param {Date} date date.
   */
  proto.eventsForDay = function(date) {
    var id = Calendar.Calc.getDayId(date),
        events = Object.keys(this.times[id] || {}),
        self = this;

    return events.map(function(id) {
      return self.get(id);
    });
  };

  /**
   * Removes a specific event based
   * on its id.
   *
   * @param {String} id busy time id.
   */
  proto.remove = function(id) {
    var dateId, event;
    if (id in this.ids) {
      event = this.ids[id];
      dateId = Calendar.Calc.getDayId(event.date);
      delete this.times[dateId][id];
      delete this.ids[id];

      this.emit('remove', id, event);

      return true;
    }

    return false;
  };

  Calendar.Store.Event = Events;

}(this));

