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
    this.remote = this.data.remote;

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
    }

  };

  return Event;

}());
