/* global DEBUGGING */
/* exported _, deepCopy, Toolkit */
'use strict';

var _ = function cc_fallbackTranslation(keystring) {
  var r = window.navigator.mozL10n.get.apply(this, arguments);
  return r || (DEBUGGING ? '!!' : '') + keystring;
};

// Deep copy algorithm with Data support
function deepCopy(object) {
  if (object === null || !(object instanceof Object)) {
    return object;
  }

  var clone, constructor = object.constructor;
  switch (constructor) {
    case Date:
      clone = new constructor(object.getTime());
      break;
    default:
      clone = constructor();
      break;
  }
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      clone[key] = deepCopy(object[key]);
    }
  }

  return clone;
}

var Toolkit = {
  checkEnoughDelay: function(threshold, dateA, dateB) {
    if (!dateA) {
      return true;
    }

    var end = dateB || new Date();
    return (end.getTime() - dateA.getTime()) > threshold;
  },

  toMidnight: function _toMidnight(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  }

};
