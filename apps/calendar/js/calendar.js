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
    }

  };

}(this));
