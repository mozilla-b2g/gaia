'use strict';

/* global AdvancedTelemetryHelper */
/* global LazyLoader */

(function(exports) {
  var namespace = 'telemetry_gaia_sync';

  var dependencies = LazyLoader.load(
    ['/shared/js/settings_listener.js',
     '/shared/js/advanced_telemetry_helper.js']);

  var Telemetry = {
    logUserAction: function(name) {
      return dependencies.then(() => {
        var histogramName = namespace + '_user_action_' + name;
        var count = new AdvancedTelemetryHelper(
          AdvancedTelemetryHelper.HISTOGRAM_COUNT,
          histogramName);
        count.add(1);
      });
    }
  };

  exports.Telemetry = Telemetry;
})(window);
