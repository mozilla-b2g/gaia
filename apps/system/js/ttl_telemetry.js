'use strict';
/* global AdvancedTelemetryHelper */

(function(exports) {

  /**
   * TTLTelemetry measures startup time as measured by "first paint".
   * There are two possible types of load events, [c] and [w].
   * [c] cold load time, is measured when the app is not currently running.
   * [w] warm load time, is measured when the app is backgrounded then launched.
   * @class TTLTelemetry
   */
  function TTLTelemetry() {

    // Event firing when app loads
    window.addEventListener('apploadtime', this);

    // 'appopening' is used to get the 'app' object 
    window.addEventListener('appopening', this);
  }

  TTLTelemetry.prototype = {

    /**
     * General event handler interface.
     * Handles events that record the app object of the current app
     * and that contain load-time data to record as a 'telemetry'
     * console entry. 
     * @memberof TTLTelemetry.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'apploadtime':
          this.recordTelemetryData(evt.detail);
          break;

        case 'appopening':
          this.app = evt.detail;
          break;
      }
    },

    recordTelemetryData: function(data) {

      var metricName;

      // Determine if the is a cold or warm start time.
      if (data.type === 'c') {
        metricName = 'ttl-cold-start';
      }
      else if (data.type === 'w') {
        metricName = 'ttl-warm-start';
      }

      var atHelper = new AdvancedTelemetryHelper(this.app, metricName);
      atHelper.add(data.time);
    }
  };

  exports.TTLTelemetry = TTLTelemetry;

}(window));
