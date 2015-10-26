/*
 * This module is a helper for recording telemetry data in Gecko’s telemetry
 * system. Currently, only data from certified apps will be recorded.
 *
 * There are three different types of metrics that can be used here:
 * Counter:  This is a simple counter that increments by 1 each time it's
 *           called.
 *
 * Linear:   This type of metric creates a linear distributed set of buckets
 *           which range between the min and max.  You can specify the number
 *           of buckets as well as the min and max.
 *
 * Exponential: This type of metric creates an exponential distributed set of
 *              buckets ranging between min and max.  You can specify the min,
 *              max, and buckets.
 *
 * App Setup:
 *   1) Add the following to the app (e.g. index.html):
 *   <script defer src="/shared/js/advanced_telemetry_helper.js"></script>
 *   <script defer src="/shared/js/settings_listener.js"></script>
 *   2) Include AdvancedTelemetryHelper in the globals.
 *
 * Counter Metric Usage Example:
 *  // This creates the histogram counter on this metric called
 *  // 'mycount'
 *  var count = new AdvancedTelemetryHelper(ATH.HISTOGRAM_COUNT, 'mycount');
 *  count.add(); //Increment the count. The count of the histogram is now 1.
 *  // DO SOMETHING
 *  count.add(); //Increment the count. The count of the histogram is now 2.
 *
 * Linear Metric Usage Example:
 *  // This creates a linear histogram called 'mylinear' with minimum
 *  // of 1 (0 not allowed as a minimum), max of 1000, with 10 buckets.
 *  var linear = new AdvancedTelemetryHelper(ATH.HISTOGRAM_LINEAR, 'mylinear',
 *      1, 1000, 10);
 *  // This adds the value 15 to the histogram 'mylinear'
 *  linear.add(15);
 *  // DO SOMETHING
 *  // This adds to the existing histogram a value of 800.
 *  linear.add(800); // The histogram now has two values, one in the 15 bucket
 *                   // and one in the bucket that holds the value 800
 *
 * Exponential Metric Usage Example:
 *  // This creates an exponential histogram called 'myexp' with minimum
 *  // of 1 (0 not allowed as a minimum), max of 1000, with 10 buckets.
 *  var exp = new AdvancedTelemetryHelper(ATH.HISTOGRAM_EXPONENTIAL, 'myexp',
 *      1, 1000, 10);
 *  // This adds the value 15 to the histogram 'myexp'
 *  exp.add(15);
 *  // DO SOMETHING
 *  // This adds to the existing histogram a value of 800.
 *  exp.add(800); // The histogram now has two values, one in the 15 bucket
 *                // and one in the bucket that holds the value 800
 *
 * Caveats:
 *  Note that after a histogram is created, it's not possible to change the type
 *  of the histogram from one type to the other.  It's necessary to create a new
 *  Histogram.
 *
 *  Each histogram should have a unique name.
 *
 */

/* globals SettingsListener */
(function(exports) {
  'use strict';

  const APP_TELEMETRY_LOG_PREFIX = 'telemetry';
  const ATH = AdvancedTelemetryHelper;
  // Export Histogram types so they can be used by apps
  ATH.HISTOGRAM_COUNT = 4;
  ATH.HISTOGRAM_EXP = 0;
  ATH.HISTOGRAM_LINEAR = 1;
  // This is exposed for unit testing purposes
  ATH.TELEMETRY_LEVEL_KEY = 'metrics.selectedMetrics.level';
  ATH.SETTINGS_INITIALIZED = false;

  // API for an exponential histogram entry.  This function creates the
  // histogram in the system and prepares it subsequent .log(value) calls
  // against it.
  // <type>:    One of ATH.HISTOGRAM_COUNT, ATH.HISTOGRAM_EXP,
  //            or ATH.HISTOGRAM_LINEAR.
  // <name>:    Unique name of the metric
  // <min>:     [Required for linear and exponential only]The minimum (non-zero)
  //            numeric value for this histogram.
  // <max>:     [Required for linear and exponential only]The maximum numeric
  //            value for this histogram.
  // <buckets>: [Required for linear and exponential only]The total number of
  //            buckets for this histogram.
  function AdvancedTelemetryHelper(type, name, min, max, buckets) {
    if (!ATH.SETTINGS_INITIALIZED) {
      ATH.SETTINGS_INITIALIZED = true;
      ATH.init();
    }

    if (typeof type !== 'undefined' && typeof name !== 'undefined') {
      if (type === ATH.HISTOGRAM_COUNT) {
        this.createHistogram(name, ATH.HISTOGRAM_COUNT, 0, 0, 0);
      } else if (type === ATH.HISTOGRAM_EXP || type === ATH.HISTOGRAM_LINEAR) {
        this.createHistogram(name, type, min, max, buckets);
      } else {
        console.warn('Must pass a Histogram type and a unique Histogram name.');
      }
    } else {
      console.warn('Must pass a Histogram type and a unique Histogram name.');
    }
  }

  AdvancedTelemetryHelper.init = function init() {
    ATH.telemetryEnabledListener = function telemetryEnabledListener(enabled) {
      if (enabled === 'Enhanced') {
        ATH.TELEMETRY_LEVEL = true;
      } else {
        ATH.TELEMETRY_LEVEL = false;
      }
    }.bind(this);

    SettingsListener.observe(ATH.TELEMETRY_LEVEL_KEY,
      false, ATH.telemetryEnabledListener);
  };

  AdvancedTelemetryHelper.prototype.createHistogram =
  function(name, type, min, max, buckets) {
    if (typeof ATH.TELEMETRY_LEVEL === 'undefined' || ATH.TELEMETRY_LEVEL) {
      if (typeof this.metricType !== 'undefined') {
        console.warn('Cannot redefine histogram.  Must create a new object');
        return;
      }

      this.metricType = type;
      if (typeof name !== 'undefined') {
        var varCount = 2;
        var message = APP_TELEMETRY_LOG_PREFIX;
        // Disallow underscores so telemetry system can parse it.
        this.metricName = name.replace('_', '-');
        message += '|' + this.metricName;
        message += '|' + type + '|';
        if (typeof min !== 'undefined') { varCount++; }
        if (typeof max !== 'undefined') { varCount++; }
        if (typeof buckets !== 'undefined') { varCount++; }

        if (varCount != 5) {
          console.warn('createHistogram must have 5 params.');
          return;
        }

        if (min < 1) {
          min = 1;
        }
        message += min + '|' + max + '|' + buckets;
        console.info(message);
      } else {
        console.warn('A telemetry log entry requires a name.');
      }
    }
  };

  // API for logging against a pre-existing histogram.  This records the value
  // for this particular histogram in the histogram system.
  // <value>: The value to record against this histogram.
  //    For a counter histogram, this can be empty or 1 can be passed.
  //    For an exponential or linear histogram a valid value > 0 must be passed.
  AdvancedTelemetryHelper.prototype.add = function(value) {
    if (typeof ATH.TELEMETRY_LEVEL === 'undefined' || ATH.TELEMETRY_LEVEL) {
      if (this.metricType == ATH.HISTOGRAM_COUNT) {
        value = 1;
      }

      if (typeof value === 'undefined' || !value || value < 1) {
        console.warn('A valid value is required to log a histogram.');
        return;
      }

      var message = APP_TELEMETRY_LOG_PREFIX + '|' + this.metricName +
        '|' + value;
      console.info(message);
    }
  };

  exports.AdvancedTelemetryHelper = AdvancedTelemetryHelper;
}(window));
