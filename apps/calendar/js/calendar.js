(function(window) {

  const NEXT_TICK = 'calendar-next-tick';
  var nextTickStack = [];

  window.Calendar = {

    DEBUG: false,

    /**
     * Very similar to node's nextTick.
     * Much faster then setTimeout.
     */
    nextTick: function(callback) {
      nextTickStack.push(callback);
      window.postMessage(NEXT_TICK, '*');
    },

    /**
     * Creates a calendar namespace.
     *
     *    // Export a view
     *    Calendar.ns('Views').Month = Month;
     *
     * @param {String} namespace like "Views".
     * @param {Boolean} checkOnly will not create new namespaces when true.
     * @return {Object} namespace ref.
     */
    ns: function(path, checkOnly) {
      var parts = path.split('.');
      var lastPart = this;
      var i = 0;
      var len = parts.length;

      for (; i < len; i++) {
        var part = parts[i];
        if (!(part in lastPart)) {
          if (checkOnly)
            return false;

          lastPart[part] = {};
        }
        lastPart = lastPart[part];
      }

      if (checkOnly)
        return true;

      return lastPart;
    },

    log: function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('CALENDAR:');
      console.error.apply(console, args);
    },

    debug: function(name) {
      return function() {
        if (!Calendar.DEBUG)
          return;

        var args = Array.prototype.slice.call(arguments);
        args = args.map(function(item) {
          return JSON.stringify(item);
        });
        args.unshift('[calendar] ');
        args.unshift(name);
        console.log.apply(console, args);
      }
    },

    /**
     * Base compare function.
     */
    compare: function(a, b) {
      if (a > b) {
        return 1;
      } else if (a < b) {
        return -1;
      }

      return 0;
    },

    /**
     * Binary search utilities taken /w permission
     * from :asuth
     */
    binsearch: {
      find: function binsearch(list, seekVal, cmpfunc, aLow, aHigh) {
        var low = ((aLow === undefined) ? 0 : aLow),
            high = ((aHigh === undefined) ? (list.length - 1) : aHigh),
            mid, cmpval;

        while (low <= high) {
          mid = low + Math.floor((high - low) / 2);
          cmpval = cmpfunc(seekVal, list[mid]);
          if (cmpval < 0)
            high = mid - 1;
          else if (cmpval > 0)
            low = mid + 1;
          else
            return mid;
        }

        return null;
      },

      insert: function bsearchForInsert(list, seekVal, cmpfunc) {
        if (!list.length)
          return 0;

        var low = 0, high = list.length - 1,
            mid, cmpval;

        while (low <= high) {
          mid = low + Math.floor((high - low) / 2);
          cmpval = cmpfunc(seekVal, list[mid]);

          if (cmpval < 0)
            high = mid - 1;
          else if (cmpval > 0)
            low = mid + 1;
          else
            break;
        }

        if (cmpval < 0)
          return mid; // insertion is displacing, so use mid outright.
        else if (cmpval > 0)
          return mid + 1;
        else
          return mid;
      }
    }
  };

  /**
   * next tick inspired by http://dbaron.org/log/20100309-faster-timeouts.
   */
  window.addEventListener('message', function handleNextTick(event) {
    if (event.source === window && event.data == NEXT_TICK) {
      event.stopPropagation();
      if (nextTickStack.length) {
        (nextTickStack.shift())();
      }
    }
  });


}(this));

