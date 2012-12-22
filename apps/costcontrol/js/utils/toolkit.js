
'use strict';

var _ = function cc_fallbackTranslation(keystring) {
  var r = navigator.mozL10n.get.apply(this, arguments);
  return r || (DEBUGGING ? '!!' : '') + keystring;
};

function toMidnight(date) {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

// Deep copy algorithm with Data support
function deepCopy(object) {
  if (object === null || !(object instanceof Object))
    return object;

  var clon, constructor = object.constructor;
  switch (constructor) {
    case Date:
      clon = new constructor(object.getTime());
      break;
    default:
      clon = constructor();
      break;
  }
  for (var key in object) {
    if (object.hasOwnProperty(key))
      clon[key] = deepCopy(object[key]);
  }

  return clon;
}

Object.prototype.extend = function _extend() {
  for (var i = 0, len = arguments.length; i < len; i++) {
    var object = arguments[i];
    for (var name in object) {
      if (object.hasOwnProperty(name)) {
        this[name] = object[name];
      }
    }
  }
  return this;
};

var NOP = function() {};

function checkEnoughDelay(threshold, dateA, dateB) {
  if (!dateA)
    return true;

  var end = dateB || new Date();
  return (end.getTime() - dateA.getTime()) > threshold;
}
