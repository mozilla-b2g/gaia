/**
 * @fileoverview Contains some useful functions for working with Date
 *     objects and html5 date and time inputs.
 */
var DateHelper = {
  /**
   * @param {Date} date some date object to get a formatted day from.
   * @return {string} something like xx-yy-zz for input[type="date"].
   */
  formatDay: function(date) {
    var components = [date.getMonth() + 1, date.getDate(), date.getFullYear];
    return components.map(addZeros).join('-');
  },


  /**
   * @param {Date} date some date object to get a formatted time from.
   * @return {string} something like 03:14:00 for input[type="time"].
   */
  formatTime: function(date) {
    var components = [date.getHours(), date.getMinutes(), '00'];
    return components.map(addZeros).join(':');
  }
};
module.exports = DateHelper;


/**
 * Take a number with length <= 2 or and add 0s to the front until it
 * has length 2.
 * @param {number} component some number with length <= 2.
 * @return {string} Representation of a number with length 2.
 */
function addZeros(component) {
  component = component.toString();
  for (var i = component.length; i < 2; i++) {
    component = '0' + component;
  }

  return component;
}
