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

    if (isNew)
      this.resetToDefaults();
  }

  Event.prototype = {

    /**
     * Sets default values of an event.
     */
    resetToDefaults: function() {
      var now = new Date();

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

    /* start date */

    get startDate() {
      return this.remote.startDate;
    },

    set startDate(value) {
      if (!(value instanceof Date)) {
        throw new TypeError('must pass instance of Date');
      }

      var time = Calendar.Calc.dateToTransport(value);
      this.remote.start = time;
      this.remote.startDate = value;
    },

    /**
     * Checks if date object only contains date information (not time).
     *
     * Exampe:
     *
     *    var time = new Date(2012, 0, 1, 1);
     *    this._isOnlyDate(time); // false
     *
     *    var time = new Date(2012, 0, 1);
     *    this._isOnlyDate(time); // true
     *
     * @return {Boolean} see above.
     */
    _isOnlyDate: function(date) {
      return (!date.getHours() &&
              !date.getMinutes() &&
              !date.getSeconds());
    },

    /* end date */

    get endDate() {
      return this.remote.endDate;
    },

    set endDate(value) {
      if (!(value instanceof Date)) {
        throw new TypeError('must pass instance of Date');
      }

      var time = Calendar.Calc.dateToTransport(value);

      this.remote.end = time;
      this.remote.endDate = value;
    },

    get isAllDay() {
      var start = this.remote.startDate;
      var end = this.remote.endDate;

      return (this._isOnlyDate(start) &&
              this._isOnlyDate(end));
    },

    /* associated records */

    get calendarId() {
      return this.data.calendarId;
    },

    set calendarId(value) {
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
     * @return {Array|False} see above.
     */
    validationErrors: function() {
      var end = this.endDate.valueOf();
      var start = this.startDate.valueOf();
      var errors = [];

      if (start > end) {
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
