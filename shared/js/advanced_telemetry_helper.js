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
 * <context>      is a string indicating the context within the app to which the
 *                telemetry data corresponds
 * <metric name>  is the name of the telemetry metric
 * <data>         is the telemetry data being added.
 * 
 * When used in this form, <context> is optional; the other values are required.
 */  
'use strict';

var APP_TELEMETRY_LOG_PREFIX = 'telemetry';

var AdvancedTelemetryHelper = (function() {

  function AdvancedTelemetryHelper(app, metricName, context) {

    switch (arguments.length) {
      case 3: 
        this.app = this.getApp(app);
        this.context = context;
        break;
      case 2:
      case 1:
        this.app = this.getApp(app);
        this.context = null;
        break;
      default:
        this.app = null;
        this.context = null;
        break;
    }
  
    if (this.app && metricName) {
      this.message = APP_TELEMETRY_LOG_PREFIX + '|' + this.app;
    
      this.message += '|' + metricName;
    }
    else {
      this.message = null;
    }
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
  
  AdvancedTelemetryHelper.prototype.add = function(telemetry) {
 
    var message;
 
    // If the app/metric name/context were passed to the constructor,
    // simply add the 'data'
    if (this.message) {
      message = this.message;
      message += '|' + telemetry;
      if (this.context) {
        message += '|' + this.context;
      }
      console.info(message);
    }
    else {

      // If the app/metric name/context were not passed to the constructor,
      // parse the input for the metric name, data, and context
      var context;
      var metricName;
      var data;
  
      // First, ensure we were instantiated with a certified app
      if (!this.app) {
        return;
      }

      // Validate the components of the telemetry data
      var params = telemetry.split('|');
      if (params.length >= 2 && params.length <=3) {
        message = APP_TELEMETRY_LOG_PREFIX + '|' + this.app;
 
        // If there are three components in the telemetry input, the first 
        // is the metricName, the second is the data, the third is the 'context'
        if (params.length === 3) {
          metricName = params[0];
          data = params[1];
          context = params[2];
        }
        else {
          // If there are two components in the telemetry input, the first 
          // is the metricName, the second is the data
          metricName = params[0];
          data = params[1];
        }
  
        message += '|' + metricName;
        message += '|' + data;
        if (context) {
          message += '|' + context;
        }
        console.info(message);
      }
      else {
        console.warn('A telemetry log entry requires three or four parameters');
      }
    } 
  };

  return AdvancedTelemetryHelper;
}());

