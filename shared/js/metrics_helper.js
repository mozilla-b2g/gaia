/**
 * This module is a helper class for modules that want to report metrics for
 * transmission to the telemetry server for collection.  This module handles the
 * details of creating an iac port for connection to the AppUsageMetrics
 * module and handles the details of reporting a message to AppUsageMetrics.
 *
 * Usage:
 * -To initialize the module:  MetricsHelper.init();
 * -To report metrics:
 * MetricsHelper.report({action: 'your action', data: 'your data'});
 * Note that this needs to be hooked up on AppUsageMetrics to deliver anything
 * meaningful to the Telemetry Server.
 *
 */
'use strict';

(function(exports) {

  function MetricsHelper() {
    this._portMetrics = null;
    this._initialized = false;
  }

  MetricsHelper.prototype = {
    init: function () {
      var self = this;
      // Initialize the port for connecting to the system app to report metrics.
      navigator.mozApps.getSelf().onsuccess = function () {
        var app = this.result;
        app.connect('app-metrics').then(function onConnAccepted(ports) {
          if (ports.length > 0) {
            self._portMetrics = ports[0];
            self._initialized = true;
          }
        }, function onConnectionRejected(reason) {
          console.log('Error connecting: ' + reason + '\n');
        });
      };
    },

    report: function (action, data) {
      if (this._initialized) {
        this._portMetrics.postMessage({
          'action': action,
          'data': data
        });
      }
    }
  };

  exports.MetricsHelper = MetricsHelper;
})(window);
