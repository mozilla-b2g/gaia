/* global SettingsListener */
'use strict';

(function(exports) {

  /**
   * TTLTelemetry measures startup time as measured by "first paint".
   * There are two possible types of load events, [c] and [w].
   * [c] cold load time, is measured when the app is not currently running.
   * [w] warm load time, is measured when the app is backgrounded then launched.
   * @class TTLTelemetry
   */
  function TTLTelemetry() {

    SettingsListener.observe('debug.ttl.enabled', false, function(value) {
      !!value ? this.enable() : this.disable();
    }.bind(this));
  }

  TTLTelemetry.prototype = {

    enable: function() {

      // Event firing when app loads
      window.addEventListener('apploadtime', this);

      // 'appopening' is used to get the 'app' object
      window.addEventListener('appopening', this);
    },

    disable: function() {

      // Event firing when app loads
      window.removeEventListener('apploadtime', this);

      // 'appopening' is used to get the 'app' object
      window.removeEventListener('appopening', this);
    },

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
          if (this.appName) {
            this.recordTelemetryData(evt.detail);
          }
          break;

        case 'appopening':
          this.appName = evt.detail.name.toLowerCase();
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

      var metric = {
        name: metricName, value: data.time, appName: this.appName
      };
      var event = new CustomEvent('advanced-telemetry-update', {
        detail: { metric: metric  }
      });
      console.log('[AdvancedTelemetry] recording metric --> ' +
        metric.name + ', ' + metric.value + ', ' + metric.appName);
      window.dispatchEvent(event);
    }
  };

  exports.TTLTelemetry = TTLTelemetry;

}(window));
