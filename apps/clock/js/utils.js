(function(exports) {
'use strict';

var Utils = {};

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
  var localeTimeFormat = navigator.mozL10n.get('dateTimeFormat_%X');
  var is12h = (localeTimeFormat.indexOf('%p') >= 0);
  return is12h;
};

Utils.getLocaleTime = function(d) {
  var f = new navigator.mozL10n.DateTimeFormat();
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

Utils.formatTime = function(hour, minute) {
  var period = '';
  if (Utils.is12hFormat()) {
    period = hour < 12 ? 'AM' : 'PM';
    hour = hour % 12;
    hour = (hour == 0) ? 12 : hour;
  }

  if (hour == 0) {
    hour = '00';
  }

  if (minute < 10) {
    minute = '0' + minute;
  }

  return hour + ':' + minute + period;
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

exports.Utils = Utils;

}(this));
