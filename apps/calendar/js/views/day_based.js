Calendar.ns('Views').DayBased = (function() {

  var Calc = Calendar.Calc;
  var hoursOfOccurance = Calendar.Calc.hoursOfOccurance;
  var OrderedMap = Calendar.OrderedMap;

  /**
   * Ordered map for storing relevant
   * details of day based views.
   */
  function DayBased() {
    Calendar.View.apply(this, arguments);

    if (!this.timespan && this.date) {
      this.timespan = Calc.spanOfDay(this.date);
    }

    this._resetHourCache();
  }

  DayBased.prototype = {
    __proto__: Calendar.View.prototype,

    _resetHourCache: function() {
      this._idsToHours = Object.create(null);
      this.hours = new OrderedMap([], Calc.compareHours);
    },

    /**
     * Date that this view represents.
     */
    date: null,

    /**
     * Range of time this view will cover.
     *
     * @type {Calendar.Timespan}
     */
    timespan: null,

    /**
     * Contains list of all rendered hours
     * and the details of those hours.
     */
    hours: null,

    /**
     * Contains a map of all rendered
     * busytime ids and which hours they occur at.
     */
    _idsToHours: null,

    /** functions for children to override */

    /**
     * This function should create, render, insert
     * a given hour into the dom and then
     * return an object for storage of the
     * details.
     */
    _insertHour: function() {},
    _removeHour: function() {},

    /**
     * This function should create, render
     * insert a given record into the dom
     * then return the object details.
     */
    _insertRecord: function(hour, busytime, record) {},

    /**
     * This has a default implementation
     * that will remove traces of busytime
     * from each hour but still should be overriden
     * to provide functionality to actually remove
     * dom elements.
     */
    _removeRecord: function(busytime, eachCb) {
      var id = busytime._id;
      var hours = this._idsToHours[id];

      if (!hours)
        return;

      hours.forEach(function(number) {
        var hour = this.hours.get(number);
        if (hour) {
          if (eachCb) {
            eachCb.call(this, id, hour, number);
          }
          hour.records.remove(id);
        }
      }, this);
    },

    /** end */

    removeHour: function(hour) {
      this._removeHour(hour);
      this.hours.remove(hour);
    },

    createHour: function(hour) {
      var details = this._insertHour(hour);
      return this.hours.set(hour, details);
    },

    /**
     * Creates a record for a given hour.
     * NOTE- this usually needs to be called
     * after creating the hour.
     *
     * @param {Numeric} hour current hour.
     * @param {Object} busytime object.
     * @param {Object} record usually an event.
     */
    createRecord: function(hour, busytime, record) {
      var hourRecord = this.hours.get(hour);
      var id = busytime._id;

      if (!hourRecord) {
        hourRecord = this.createHour(hour);
      }

      var result = this._insertRecord(
        hour, busytime, record
      );

      if (id in this._idsToHours) {
        this._idsToHours[id].push(hour);
      } else {
        this._idsToHours[id] = [hour];
      }

      return hourRecord.records.set(
        id, result
      );
    },

    /**
     * Add a busytime to the view.
     *
     * @param {Object} busytime busytime object.
     * @param {Object} event related event object.
     */
    add: function(busytime, event) {
      var hours = hoursOfOccurance(
        this.date,
        busytime.startDate,
        busytime.endDate
      );

      hours.forEach(function(hour) {
        this.createRecord(hour, busytime, event);
      }, this);
    },

    /**
     * Remove a busytime from the view.
     *
     * @param {Object} busytime busytime object.
     */
    remove: function(busytime) {
      var id = busytime._id;
      this._removeRecord(busytime);
      delete this._idsToHours[id];
    }

  };

  return DayBased;

}());
