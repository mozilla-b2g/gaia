define(function(require) {
'use strict';

var mozL10n = require('l10n');

var Utils = {};
// Maintain references to millisecond multipliers
var dateMultipliers = {
  days: 1000 * 60 * 60 * 24,
  hours: 1000 * 60 * 60,
  minutes: 1000 * 60,
  seconds: 1000,
  milliseconds: 1
};
var units = Object.keys(dateMultipliers);

Utils.dateMath = {
  /**
   * Convert object literals containing interval length to milliseconds
   *
   * @param {Object|Date|Number} interval An object literal containing days,
   *                                      hours, minutes etc.
   *                                      Optionally a number or date object.
   * @param {Object} opts Options object with a unitsPartial property containing
   *                      (if desired) a restriction on which properties will be
   *                      searched on the interval.
   * @return {Number} Millisecond value for interval length.
   */
  toMS: function(interval, opts) {
    var converted, sign, unitsPartial;

    // if a millisecond interval or a Date is passed in, return that
    if (interval instanceof Date || typeof interval === 'number') {
      return +interval;
    }

    opts = opts || {};
    unitsPartial = opts.unitsPartial || units;
    // Allow for 'hours' or 'hour'
    unitsPartial = unitsPartial.map(function(unit) {
      // String.prototype.endsWith is available in FF17+
      return unit.endsWith('s') ? unit : unit.concat('s');
    });

    // some will exit early when it returns a truthy value
    sign = unitsPartial.some(function(unit) {
      return interval[unit] < 0;
    });
    // Using as a multiplier later
    sign = sign ? -1 : 1;
    // collect passed in units and multiply by their millisecond/unit count
    converted = unitsPartial.map(function(unit) {
      var partial;
      // we're storing the sign out of the iterator
      partial = Math.abs(interval[unit]);
      // A missing property and 0 should be treated the same
      return partial ? partial * dateMultipliers[unit] : 0;
    });

    // add up each millisecond-converted term and multiply total by sign
    return sign * converted.reduce(function(a, b) { return a + b; });
  },
  /**
   * Convert millisecond values to object literals conformable to toMS()
   *
   * @param {Number} interval A millisecond value.
   * @param {Object} [opts] Options object with a unitsPartial property
   *                        containing (if desired) a restriction on which
   *                        properties will be reated for the return value.
   * @return {Object} Object literal with properties as deliniated by opts.
   */
  fromMS: function(interval, opts) {
    var times, sign, unitsPartial;

    opts = opts || {};
    unitsPartial = opts.unitsPartial || units;
    // Allow for 'hours' or 'hour'
    unitsPartial = unitsPartial.map(function(unit) {
      // String.prototype.endsWith is available in FF17+
      return unit.endsWith('s') ? unit : unit.concat('s');
    });
    // For negative intervals (time previous to now)
    // update interval to absolute value and store the sign
    // to apply to all units
    if (interval < 0) {
      sign = -1;
      interval = Math.abs(interval);
    } else {
      sign = 1;
    }

    // divide the time interval by the highest millisecond multiplier
    // store the truncated result and subtract that from the interval
    // update the interval to be the remainder
    times = unitsPartial.map(function(unit, index) {
      var truncated, mult;
      mult = dateMultipliers[unit];
      truncated = Math.floor(interval / mult);
      interval = interval - (truncated * mult);
      // units are either all positive or negative
      // only iterate to needed specificity
      return sign * truncated;
    });

    // Populate the returned object using units as property names
    // and times for values
    return times.reduce(function(out, unitTime, index) {
      out[unitsPartial[index]] = unitTime;
      return out;
    }, {});
  }
};

Utils.extend = function(initialObject, extensions) {
  // extend({}, a, b, c ... d) -> {...}
  // rightmost properties (on 'd') take precedence
  extensions = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < extensions.length; i++) {
    var extender = extensions[i];
    for (var prop in extender) {
      if (Object.prototype.hasOwnProperty.call(extender, prop)) {
        initialObject[prop] = extender[prop];
      }
    }
  }
  return initialObject;
};

Utils.escapeHTML = function(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
};

Utils.is12hFormat = function() {
  var localeTimeFormat = mozL10n.get('dateTimeFormat_%X');
  var is12h = (localeTimeFormat.indexOf('%p') >= 0);
  return is12h;
};

Utils.getLocaleTime = function(d) {
  var f = new mozL10n.DateTimeFormat();
  var is12h = Utils.is12hFormat();
  return {
    t: f.localeFormat(d, (is12h ? '%I:%M' : '%H:%M')).replace(/^0/, ''),
    p: is12h ? f.localeFormat(d, '%p') : ''
  };
};

Utils.changeSelectByValue = function(selectElement, value) {
  var options = selectElement.options;
  for (var i = 0; i < options.length; i++) {
    if (options[i].value == value) {
      if (selectElement.selectedIndex != i) {
        selectElement.selectedIndex = i;
      }
      break;
    }
  }
};

Utils.getSelectedValue = function(selectElement) {
  return selectElement.options[selectElement.selectedIndex].value;
};


Utils.parseTime = function(time) {
  var parsed = time.split(':');
  var hour = +parsed[0]; // cast hour to int, but not minute yet
  var minute = parsed[1];

  // account for 'AM' or 'PM' vs 24 hour clock
  var periodIndex = minute.indexOf('M') - 1;
  if (periodIndex >= 0) {
    hour = (hour == 12) ? 0 : hour;
    hour += (minute.slice(periodIndex) == 'PM') ? 12 : 0;
    minute = minute.slice(0, periodIndex);
  }

  return {
    hour: hour,
    minute: +minute // now cast minute to int
  };
};

Utils.safeCpuLock = function(timeoutMs, fn) {
    /*
     * safeCpuLock
     *
     * Create a CPU lock that is automatically released after
     * timeoutMs.
     *
     *
     * @timeoutMs {integer} a number of milliseconds
     * @callback {Function} a function to be called after
     *           all other generated callbacks have been
     *           called
     *           function ([err]) -> undefined
     */
  var cpuWakeLock, unlockTimeout;
  var unlockFn = function() {
    clearTimeout(unlockTimeout);
    if (cpuWakeLock) {
      cpuWakeLock.unlock();
      cpuWakeLock = null;
    }
  };
  unlockTimeout = setTimeout(unlockFn, timeoutMs);
  try {
    cpuWakeLock = navigator.requestWakeLock('cpu');
    fn(unlockFn);
  } catch (err) {
    unlockFn();
    throw err;
  }
};

Utils.repeatString = function rep(str, times) {
  var built = [], cur = str;
  for (var i = 0, j = 1; j <= times; i++) {
    if ((times & j) > 0) {
      built.push(cur);
    }
    cur = cur + cur;
    j = j << 1;
  }
  return built.join('');
};

Utils.format = {
  time: function(hour, minute, opts) {
    var period = '';
    opts = opts || {};
    opts.meridian = typeof opts.meridian === 'undefined' ? true : opts.meridian;
    var padHours = typeof opts.padHours === 'undefined' ? false : opts.padHours;
    opts.padHours = padHours;

    if (opts.meridian && Utils.is12hFormat()) {
      period = hour < 12 ? 'AM' : 'PM';
      hour = hour % 12;
      hour = (hour === 0) ? 12 : hour;
    }

    if (opts.padHours && hour < 10) {
      hour = '0' + hour;
    }

    if (hour === 0) {
      hour = '00';
    }

    if (minute < 10) {
      minute = '0' + minute;
    }

    return hour + ':' + minute + period;
  },
  hms: function(sec, format) {
    var hour = 0;
    var min = 0;

    if (sec >= 3600) {
      hour = Math.floor(sec / 3600);
      sec -= hour * 3600;
    }

    if (sec >= 60) {
      min = Math.floor(sec / 60);
      sec -= min * 60;
    }

    hour = (hour < 10) ? '0' + hour : hour;
    min = (min < 10) ? '0' + min : min;
    sec = (sec < 10) ? '0' + sec : sec;

    if (typeof format !== 'undefined') {
      format = format.replace('hh', hour);
      format = format.replace('mm', min);
      format = format.replace('ss', sec);

      return format;
    }
    return hour + ':' + min + ':' + sec;
  },
  durationMs: function(ms) {
    var dm = Utils.dateMath.fromMS(ms, {
      unitsPartial: ['minutes', 'seconds', 'milliseconds']
    });
    var puts = function(x, n) {
      x = String(x);
      return Utils.repeatString('0', Math.max(0, n - x.length)) + x;
    };
    return [
      puts(dm.minutes, 2), ':',
      puts(dm.seconds, 2), '.',
      puts((dm.milliseconds / 10) | 0, 2)
    ].join('');
  }
};


Utils.async = {

  generator: function(latchCallback) {
    /*
     * Generator
     *
     * Create an async generator. Each time the generator is
     * called, it will return a new callback. When all issued
     * callbacks have been called, the latchCallback is called.
     *
     * If any of the callbacks are called with and error as
     * the first argument, the latchCallback will be called
     * immediately with that error.
     *
     * @latchCallback {Function} a function to be called after
     *           all other generated callbacks have been
     *           called
     *           function ([err]) -> undefined
     */
    var tracker = new Map();
    var issuedCallbackCount = 0;
    var disabled = false;
    var testFn = function(err) {
      var trackerSize;
      if (!disabled) {
        // FF18 defines size to be a method, so we need to test here:
        // Remove with FF18 support
        if (typeof tracker.size === 'function') {
          trackerSize = tracker.size();
        } else {
          trackerSize = tracker.size;
        }
        if (err || trackerSize === issuedCallbackCount) {
          disabled = true;
          latchCallback && latchCallback(err);
        }
      }
    };
    return function() {
      return (function() {
        var i = issuedCallbackCount++;
        return function(err) {
          tracker.set(i, true);
          testFn(err);
        };
      })();
    };
  },

  namedParallel: function(names, latchCallback) {
    /*
     * namedParallel
     *
     * Create an async namedParallel.
     *
     * The return value is an object containing the parameters
     * specified in the names array. Each parameter is set to
     * a callback. When all callbacks have been called, latchCallback
     * is called.
     *
     * If any named callback is called with an error as the first
     * parameter, latchCallback is immediately called with that
     * error. Future calls to callbacks are then no-ops.
     *
     * @names {List<String>} - A list of strings to be used as
     *        parameter names for callbacks on the returned object.
     */
    var generator = Utils.async.generator(latchCallback);
    var done = generator();
    var ret = {};
    for (var i = 0; i < names.length; i++) {
      ret[names[i]] = generator();
    }
    done();
    return ret;
  }

};

Utils.data = {

  defaultCompare: function ud_defaultCompare(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      var diff = a - b;
      return diff !== 0 ? diff / Math.abs(diff) : diff;
    } else if ((typeof a === 'string' || a instanceof String) &&
               (typeof b === 'string' || b instanceof String)) {
      return (a < b) ? -1 : ((a > b) ? 1 : 0);
    } else if (Array.isArray(a) && Array.isArray(b)) {
      var commonLength = Math.min(a.length, b.length);
      for (var i = 0; i < commonLength; i++) {
        var compareResult = Utils.data.defaultCompare(a[i], b[i]);
        if (compareResult !== 0) {
          return compareResult;
        }
      }
      return b.length - a.length;
    } else {
      throw new Error('Cannot compare ' + JSON.stringify([a, b]));
    }
  },

  keyedCompare: function ud_keyedCompare(key) {
    return function internal_keyedCompare(a, b) {
      return Utils.data.defaultCompare(a[key], b[key]);
    };
  },

  binarySearch: function ud_binarySearch(key, list, compare) {
    compare = compare || Utils.data.defaultCompare;
    var botI = 0;
    var topI = list.length;
    var midI, comp, value;
    if (list.length > 0) {
      do {
        midI = botI + ((topI - botI) / 2) | 0;
        value = list[midI];
        comp = compare(value, key);
        if (comp < 0) {
          botI = midI + 1;
        } else if (comp > 0) {
          topI = midI - 1;
        }
      } while (comp !== 0 && botI < topI);
    }
    midI = comp === 0 ? midI : topI;
    value = list[midI];
    if (comp === 0 || value && compare(value, key) === 0) {
      return { match: true, index: midI, value: value };
    } else {
      var index;
      if (0 > midI) {
        index = 0;
      } else if (midI >= list.length) {
        index = list.length;
      } else {
        index = midI + (compare(value, key) < 0 ? 1 : 0);
      }
      return {
        match: false,
        index: index
      };
    }
  },

  sortedInsert: function ud_sortedInsert(item, list, compare, unique) {
    compare = compare || Utils.data.defaultCompare;
    var bs = Utils.data.binarySearch(item, list, compare);
    var inserted = !bs.match || !unique;
    if (inserted) {
      list.splice(bs.index, 0, item);
    }
    return (inserted) ? bs.index : null;
  },

  sortedRemove: function ud_sortedRemove(item, list, compare, multiple) {
    compare = compare || Utils.data.defaultCompare;
    var removed = false;
    if (!multiple) {
      var bs = Utils.data.binarySearch(item, list, compare);
      if (bs.match) {
        list.splice(bs.index, 1);
        removed = true;
      }
    } else {
      var biasedCompare = function(target, result, ic) {
        return function(a, b) {
          if (ic(a, target) === 0) {
            return result;
          } else {
            return ic(a, b);
          }
        };
      };
      var leftBound = Utils.data.binarySearch(item, list,
        biasedCompare(item, 1, compare));
      var rightBound = Utils.data.binarySearch(item, list,
        biasedCompare(item, -1, compare));
      if (leftBound.index < rightBound.index) {
        list.splice(leftBound.index, rightBound.index - leftBound.index);
        removed = true;
      }
    }
    return removed;
  }

};

return Utils;

});
