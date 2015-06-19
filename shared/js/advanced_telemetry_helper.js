/* exported AdvancedTelemetryHelper */
/*
 * This module is a helper for recording telemetry data in Gecko’s telemetry
 * system. Only data from certified apps will be recorded.
 *
 * Constructor
 * 
 *   app        - the application (App object) to which the telemetry data
 *                corresponds (required)
 *   metricName - the name of the telemetry metric (optional) 
 *   context    - the context within the application to which the data
 *                corresponds (optional)
 *
 * There are two ways to use the AdvancedTelemetryHelper object.
 * 
 * Use the constructor to set the app, metric name, and context.
 * Instantiating an AdvancedTelemetryHelper object this way allows the consumer
 * of the object to add telemetry data by invoking the 'add' function, passing
 * only the telemetry data to be added.
 *
 * Alternatively, the object can be instantiated by passing only the app
 * object to the constructor. In this scenario, all the telemetry data is
 * passed to the 'add' function in this format:
 * 
 * "<context>|<metric name>|<data>'"
 * 
 * where:
 *
 * <metric name>  is the name of the telemetry metric
 *                telemetry data corresponds
 * <data>         is the telemetry data being added.
 * <context>      is a string indicating the context within the app to which the
 * 
 * When used in this form, <context> is optional; the other values are required.
 */  
'use strict';

var APP_TELEMETRY_LOG_PREFIX = 'telemetry';

var AdvancedTelemetryHelper = (function() {

  function AdvancedTelemetryHelper() {
  }
  
  AdvancedTelemetryHelper.prototype.getApp = function(app) {
    try {
      var url = new URL(app.manifestURL);
      if (url.hostname.indexOf('gaiamobile.org') >= 0) {
        return app.manifest.name;
      }
      else {
       console.warn('App telemetry supports certified apps only.');
      }
    } catch (e) {
      return false;
    }
  };
  
  AdvancedTelemetryHelper.prototype.add = function(name, value, context) {

    var message;
 
    if (name && value) {
      message = APP_TELEMETRY_LOG_PREFIX;

      message += '|' + name;
      message += '|' + value;
      if (context) {
        message += '|' + context;
      }
      console.info(message);
    }
    else {
      console.warn('A telemetry log entry requires two or three parameters');
    }
  };

  return AdvancedTelemetryHelper;
}());

