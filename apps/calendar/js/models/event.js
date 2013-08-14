Calendar.ns('Models').Event = (function() {

  /**
   * Creates a wrapper around a event instance from the db
   */
  function Event(data) {
    var isNew = false;

    if (typeof(data) === 'undefined') {
      isNew = true;
      data = Object.create(null);
      data.remote = {};
    }

    this.data = data;
    /** shortcut */
    var remote = this.remote = this.data.remote;

    if ('start' in remote && !('startDate' in remote)) {
      remote.startDate = Calendar.Calc.dateFromTransport(
        remote.start
      );
    }

    if ('end' in remote && !('endDate' in remote)) {
      remote.endDate = Calendar.Calc.dateFromTransport(
        remote.end
      );
    }

    if (isNew) {
      this.resetToDefaults();
    }

    var start = this.remote.startDate;
    var end = this.remote.endDate;

    // the typeof check is to see if we have already
    // set the value in resetToDefaults (or prior)
    if (
        typeof(this._isAllDay) === 'undefined' &&
        Calendar.Calc.isOnlyDate(start) &&
        Calendar.Calc.isOnlyDate(end)
    ) {
      // mostly to handle the case before the time
      // where we actually managed isAllDay as a setter.
      this.isAllDay = true;
    } else {
      // not on prototype intentionally because
      // we need to either need to resetToDefaults
      // or check startDate/endDate in the constructor.
      this.isAllDay = false;
    }
  }

  Event.prototype = {

    /**
     * Sets default values of an event.
     */
    resetToDefaults: function() {
      var now = new Date();

      this.isAllDay = false;

      this.startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      this.endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
    },

    get _id() {
      return this.data._id;
    },

    _setDate: function(date, field) {
      if (!(date instanceof Date)) {
        throw new TypeError('must pass instance of Date');
      }

      var allDay = this.isAllDay;

      if (allDay) {
        // clone the existing date
        date = new Date(date.valueOf());

        // filter out the stuff we don't care about
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
      }

      this.remote[field] = Calendar.Calc.dateToTransport(
        date,
        null, // TODO allow setting tzid
        allDay
      );

      this.remote[field + 'Date'] = date;
    },

    /* start date */

    get startDate() {
      return this.remote.startDate;
    },

    set startDate(value) {
      this._setDate(value, 'start');
    },

    /* end date */

    get endDate() {
      return this.remote.endDate;
    },

    set endDate(value) {
      this._setDate(value, 'end');
    },

    set isAllDay(value) {
      this._isAllDay = value;

      // send values through the their setter.
      if (this.endDate) {
        this.endDate = this.endDate;
      }

      if (this.startDate) {
        this.startDate = this.startDate;
      }
    },

    get isAllDay() {
      return this._isAllDay;
    },

    /* associated records */

    get calendarId() {
      return this.data.calendarId;
    },

    set calendarId(value) {
      if (value && typeof(value) !== 'number') {
        value = Calendar.probablyParseInt(value);
      }

      this.data.calendarId = value;
    },

    /* simple setters */

    get syncToken() {
      return this.remote.syncToken;
    },

    set syncToken(value) {
      this.remote.syncToken = value;
    },

    get title() {
      return this.remote.title || '';
    },

    set title(value) {
      this.remote.title = value;
    },

    get description() {
      return this.remote.description || '';
    },

    set description(value) {
      this.remote.description = value;
    },

    get location() {
      return this.remote.location || '';
    },

    set location(value) {
      return this.remote.location = value;
    },

    get alarms() {
      return this.remote.alarms || [];
    },

    set alarms(value) {
      return this.remote.alarms = value;
    },

    /**
     * If data doesn't have any errors, the event
     * takes on the attributes of data.
     *
     * @param {Object} data, object that contains
     *  at least some attributes of the event object.
     *
     * @return {Object} errors if validationErrors returns erros,
     *  true otherwise.
     */
    updateAttributes: function(data) {
      var errors = this.validationErrors(data);
      if (errors) {
        return errors;
      }
      for (var field in data) {
        this[field] = data[field];
      }
      return true;
    },

    /**
     * Validates the contents of the model.
     *
     * Output example:
     *
     *   [
     *     {
     *       name: 'invalidDate',
     *       properties: ['startDate', 'endDate']
     *     }
     *     //...
     *   ]
     *
     * @param {Object} data, optional object that contains
     *  at least some attributes of the event object.
     * @return {Array|False} see above.
     */
    validationErrors: function(data) {
      var obj = data || this;
      var end = obj.endDate.valueOf();
      var start = obj.startDate.valueOf();
      var errors = [];

      if (start >= end) {
        errors.push({
          name: 'start-after-end'
        });
      }

      if (errors.length) {
        return errors;
      }

      return false;
    }

  };

  return Event;

}());
