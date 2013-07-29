(function(exports) {
'use strict';

var Utils = {};

Utils.extend = function(initialObject, extensions) {
  // extend({}, a, b, c ... d) -> {...}
  // rightmost properties (on 'd') take precedence
  var set = {};
  extensions = Array.prototype.slice.call(arguments, 1);
  // reverse order
  for (var i = extensions.length - 1; i >= 0; i--) {
    var extender = extensions[i];
    for (var j in extender) {
      if (extender.hasOwnProperty(j) &&
          !set.hasOwnProperty(j)) {
        // hasOwnProperty on extension object,
        // and we have not been overriden by an
        // object to our right

        initialObject[j] = extender[j];
        set[j] = true;
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
  var cpuWakeLock;
  var unlockFn = function() {
    if (cpuWakeLock) {
      cpuWakeLock.unlock();
      cpuWakeLock = null;
    }
  };
  setTimeout(unlockFn, timeoutMs);
  try {
    cpuWakeLock = navigator.requestWakeLock('cpu');
    fn(unlockFn);
  } catch (err) {
    unlockFn();
    throw err;
  }
};

Utils.asyncGenerator = function(callback) {
  var tracker = new Map();
  var size = 0;
  var disabled = false;
  var testFn = function(err) {
    var mapSize;
    if (!disabled) {
      var trackerSize;
      if ((typeof tracker.size) === 'function') {
        trackerSize = tracker.size();
      } else {
        trackerSize = tracker.size;
      }
      if (err || trackerSize === size) {
        disabled = true;
        callback && callback(null);
      }
    }
  };
  var builder = function() {
    return (function(i) {
      var i = size++;
      return function() {
        tracker.set(i, true);
        testFn();
      };
    })();
  };
  return builder;
};

Utils.asyncNamedParallel = function(names, callback) {
  var generator = Utils.asyncGenerator(callback);
  var ret = {};
  for (var i = 0; i < names.length; i++) {
    ret[names[i]] = generator();
  }
  return ret;
};

exports.Utils = Utils;

}(this));
