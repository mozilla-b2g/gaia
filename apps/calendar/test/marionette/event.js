// TODO(gareth): Perhaps it's possible for us to get some utility out of
//     borrowing a factory from the calendar model arsenal?
/**
 * @constructor
 */
function Event() {
}
module.exports = Event;


Event.prototype = {
  /**
   * Event alarms.
   * @type {Array.<string>}
   */
  alarms: null,


  /**
   * String representation of associated calendar.
   * @type {string}
   */
  calendar: null,


  /**
   * String representation of day this event ends.
   * @type {string}
   */
  endDate: null,


  /**
   * String representation of time this event ends.
   * @type {string}
   */
  endTime: null,


  /**
   * Event location.
   * @type {string}
   */
  location: null,


  /**
   * String representation of day this event starts.
   * @type {string}
   */
  startDate: null,


  /**
   * String representation of time this event starts.
   * @type {string}
   */
  startTime: null,


  /**
   * Event title.
   * @type {string}
   */
  title: null
};
