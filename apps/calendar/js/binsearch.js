/**
 * Binary search utilities taken /w permission from :asuth
 */
define(function(require, exports) {
'use strict';

exports.find = function(list, seekVal, cmpfunc, aLow, aHigh) {
  var low = ((aLow === undefined) ? 0 : aLow),
      high = ((aHigh === undefined) ? (list.length - 1) : aHigh),
      mid, cmpval;

  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0) {
      high = mid - 1;
    } else if (cmpval > 0) {
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return null;
};

exports.insert = function(list, seekVal, cmpfunc) {
  if (!list.length) {
    return 0;
  }

  var low = 0, high = list.length - 1,
      mid, cmpval;

  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);

    if (cmpval < 0) {
      high = mid - 1;
    } else if (cmpval > 0) {
      low = mid + 1;
    } else {
      break;
    }
  }

  if (cmpval < 0) {
    return mid; // insertion is displacing, so use mid outright.
  } else if (cmpval > 0) {
    return mid + 1;
  } else {
    return mid;
  }
};

});
