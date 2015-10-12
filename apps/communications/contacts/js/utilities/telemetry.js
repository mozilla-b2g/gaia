/*
Copyright 2015, Mozilla Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';
/* global AdvancedTelemetryHelper */
/* global LazyLoader */

(function(exports) {

  var namespace = 'telemetry_gaia_contacts';

  var dependencies = LazyLoader.load(
    ['/shared/js/settings_listener.js',
     '/shared/js/advanced_telemetry_helper.js']);

  var Telemetry = {
    logImportUsage: function(name) {
      return dependencies.then(() => {
        var histogramName = namespace + '_import_' + name;
        var count = new AdvancedTelemetryHelper(
          AdvancedTelemetryHelper.HISTOGRAM_COUNT,
          histogramName);
        count.add(1);  
      });
    }
  };

  exports.Telemetry = Telemetry;
  // For testing purposes
  exports.TelemetryReady = dependencies;

})(window);
