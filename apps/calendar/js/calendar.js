(function(window) {

  window.Calendar = {

    /**
     * Creates a calendar namespace.
     *
     *    // Export a view
     *    Calendar.ns('Views').Month = Month;
     *
     * @param {String} namespace like "Views".
     * @return {Object} namespace ref.
     */
    ns: function(path) {
      var parts = path.split('.');
      var lastPart = this;
      var i = 0;
      var len = parts.length;

      for (; i < len; i++) {
        var part = parts[i];
        if (!(part in lastPart)) {
          lastPart[part] = {};
        }
        lastPart = lastPart[part];
      }

      return lastPart;
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

}(this));

