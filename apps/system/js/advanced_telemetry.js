/**
 * This module is responsible for managing the AdvancedTelemetry features in
 * Gaia. Advanced Telemetry includes:
 *  1) Engineering Performance metrics on a per app basis that are collected
 *  by the HUD engine in gecko.
 *  2) Custom App Metrics.  Apps can define their custom metrics and have them
 *  collected in a histogram as well.  This API is defined via the
 *  AdvancedTelemetryHelper.
 *
 * Metrics are gathered in gecko and requested from AdvancedTelemetry Module
 * when it is time to ship the metrics to the server depending on the send
 * interval desired.
 */

/* global asyncStorage, SettingsListener, uuid, TelemetryRequest */
(function(exports) {
  'use strict';

  // This is the asyncStorage key we use to persist our device ID
  const DEVICE_ID_KEY = 'metrics.advanced_telemetry.deviceID.v4';

  // Constants for events we register/unreg for
  const IDLE = 'idle';
  const ACTIVE = 'active';
  const HUDMETRICS = 'advanced-telemetry-update';


  // Constant for debugging lines
  const AT_DEBUG_PREFIX = '[AdvancedTelemetry]';

  // This is the list of event types we register handlers for
  const EVENT_TYPES = [
    IDLE,
    ACTIVE,
    HUDMETRICS
  ];


  // This AdvancedTelemetry() constructor is the value we export from
  // this module. This constructor does no initialization itself: that
  // is all done in the start() instance method. See bootstrap.js for
  // the code that actually calls the constructor and the start method.
  function AdvancedTelemetry() {}

  // We use the acronym AT internally to save typing and make
  // references to class variables and constants more legible.
  const AT = AdvancedTelemetry;

  AT.BatchTiming = BatchTiming;

  // This the ping type in the v4 telemetry spec.  Exposed for unit testing.
  AT.REASON = 'advancedtelemetry';

  // asyncStorage key that stores the BatchTiming start time.
  AT.BATCH_KEY = 'metrics.advanced_telemetry.data.v4';

  // Set to true to to enable debug output.  Not recommended to turn this
  // on except while doing deep debugging.
  AT.DEBUG = false;

  // LOGINFO method allows for debugging of initialization events and
  // packet sending events and is at a higher level then DEBUG.
  AT.LOGINFO = false;

  function debug(...args) {
    if (!AT.DEBUG) {
      return;
    }

    var iCount = 0;
    // Get the total length of all arguments passed
    args.forEach(function (value) {
      iCount += value.length;
    });
    // if the length is greater than what adb console can handle, chunk it up.
    if (iCount > 1000) {
      var longLine = '';
      args.forEach(function (value) {
        longLine += value;
      });
      // Chop it into chunks of what adb console can handle.
      var array = longLine.match(/.{1,1000}/g);
      // Output each chunk to the console
      array.forEach(function (value) {
        console.log(AT_DEBUG_PREFIX + value);
      });
    } else {
      // Its < what ADB can handle so just output it normally.
      args.unshift(AT_DEBUG_PREFIX);
      console.log.apply(console, args);
    }
  }

  // This info level is more of a information level.  It's recommended to
  // turn this on just to see general events related to initializations,
  // and sending of payloads, etc.
  function loginfo(...args) {
    if (AT.LOGINFO) {
      args.unshift('[AdvancedTelemetryInfo]');
      console.log.apply(console, args);
    }
  }

  // This value is what turns advanced telemetry on/off
  AT.TELEMETRY_ENABLED_KEY = 'debug.performance_data.advanced_telemetry';

  // Base URL for sending data reports
  // Needs to be formatted as:
  // /submit/telemetry/id/reason/appName/appUpdateChannel/appVersion/appBuildID
  AT.REPORT_URL = 'https://incoming.telemetry.mozilla.org/submit/telemetry';
  // How often do we try to send the reports
  // Can be overridden with metrics.advancedtelemetry.reportInterval setting.
  AT.REPORT_INTERVAL = 24 * 60 * 60 * 1000;  // 1 DAY

  // If the telemetry server does not respond within this amount of time
  // just give up and try again later.
  // Can be overridden with metrics.advancedtelemetry.reportTimeout setting.
  AT.REPORT_TIMEOUT = 20 * 1000;             // 20 seconds

  // How long do we wait before trying it again?
  AT.RETRY_INTERVAL = 60 * 60 * 1000;        // 1 hour

  // Telemetry payload version
  AT.TELEMETRY_VERSION = 4;

  // App name (static for Telemetry)
  AT.TELEMETRY_APP_NAME = 'FirefoxOS';


  AT.prototype.start = function start() {
    loginfo('Starting AdvancedTelemetry');
    this.advancedTelemetryEnabledListener =
      function advancedTelemetryEnabledListener(enabled) {
        if (enabled) {
          loginfo('Start Collecting');
          this.startCollecting();
        }
        else {
          loginfo('Stop Collecting');
          this.stopCollecting();
        }
      }.bind(this);

    SettingsListener.observe(AT.TELEMETRY_ENABLED_KEY,
      false, this.advancedTelemetryEnabledListener);
  };

  AT.prototype.stopCollecting = function stopCollecting() {
    this.collecting = false;
    EVENT_TYPES.forEach(function (type) {
      window.removeEventListener(type, self);
    });
  };

  AT.prototype.startCollecting = function startCollecting(done) {
    var self = this;
    // If we're already running there is nothing to start
    if (this.collecting) {
      return;
    }
    this.collecting = true;

    this.metrics = new BatchTiming(true);

    getDeviceID();

    function getDeviceID() {
      asyncStorage.getItem(DEVICE_ID_KEY, function(value) {
        if (value) {
          self.deviceID = value;
        }
        else {
          // Our device id does not need to be unique, just probably unique.
          self.deviceID = uuid();
          asyncStorage.setItem(DEVICE_ID_KEY, self.deviceID);
        }

        // Move on to the next step in the startup process
        registerHandlers();
      });
    }

    function registerHandlers() {
      // Basic event handlers
      EVENT_TYPES.forEach(function (type) {
        window.addEventListener(type, self);
      });

      self.startBatch();

      if (done) {
        loginfo('Initialization Complete');
        done();
      }
    }
  };

  // This method shuts everything down and is only exposed for unit testing.
  // Note that this is not the same as the stopCollecting() method which is
  // used to stop data collection but keep the module running.
  AT.prototype.stop = function stop() {
    this.stopCollecting();
    SettingsListener.unobserve(AT.TELEMETRY_ENABLED_KEY,
      this.advancedTelemetryEnabledListener);
  };

  // Reset (or initialize) the AdvancedTelemetry instance variables
  AT.prototype.reset = function() {
    this.collecting = false;
    this.metrics = null;
    this.deviceID = null;
  };

  AT.prototype.handleEvent = function handleEvent(e) {
    switch (e.type) {
      case HUDMETRICS:
        if (this.collecting && navigator.onLine) {
          this.transmit(e.detail);
        }
        break;
      default:
        break;
    }
  };

  // Signal gecko to send the histograms with a telemetry message.
  AT.prototype.getPayload = function getPayload() {
    // TODO: Add this line below to AdvancedTelemetryHelper as an API.
    console.info('telemetry|MGMT|TIMETOSHIP');
  };

  // Signal gecko to clear out the histograms and start fresh.
  AT.prototype.clearPayload = function clearPayload() {
    // TODO: Add this line below to AdvancedTelemetryHelper as an API.
    console.info('telemetry|MGMT|CLEARMETRICS');
  };

  // Start a timer to notify when to send the payload.
  AT.prototype.startBatch = function startBatch() {
    var self = this;
    this.timer = setTimeout(function() {
      if (navigator.onLine) {
        self.getPayload();
      }
    }, self.metrics.getInterval());
  };

  AT.prototype.stopBatch = function stopBatch() {
    clearTimeout(this.timer);
  };

  // Once we have the histogram payload, we can send it to the telemetry
  // server.  Once we receive 200 OK back from telemetry server, we can
  // start a fresh batch of metrics.
  AT.prototype.transmit = function transmit(payload) {
    var self = this;
    if (!this.collecting || !navigator.onLine) {
      return;
    }

    // But assume that it will succeed and start collecting new metrics now
    this.metrics = new BatchTiming(false);
    this.startBatch();

    var deviceInfoQuery = {
      'app.update.channel': 'unknown',
      'deviceinfo.platform_version': 'unknown',
      'deviceinfo.platform_build_id': 'unknown'
    };


    // Query the settings db for parameters for the URL
    TelemetryRequest.getSettings(deviceInfoQuery, function(deviceResponse) {
      // Note that this wrapper is using the new v4 Unified Telemetry format
      var wrapper = {
        type: AT.REASON,
        id: uuid(),
        creationDate: new Date().toISOString(),
        version: AT.TELEMETRY_VERSION,
        application: {
          architecture: 'arm',
          buildId: deviceResponse['deviceinfo.platform_build_id'],
          name: AT.TELEMETRY_APP_NAME,
          version: deviceResponse['deviceinfo.platform_version'],
          vendor: 'Mozilla',
          platformVersion: deviceResponse['deviceinfo.platform_version'],
          xpcomAbi: 'arm-gcc3',
          channel: deviceResponse['app.update.channel']
        },
        clientId: self.deviceID,
        payload: payload
      };

      debug(JSON.stringify(wrapper));

      // Build the wrapper for the telemetry version
      send(wrapper, deviceResponse);
    });

    function send(payload, deviceInfoQuery) {
      var request = new AdvancedTelemetryPing(payload, deviceInfoQuery,
        self.deviceID);

      // We don't actually have to do anything if the data is transmitted
      // successfully. We are already set up to collect the next batch of data.
      function onload() {
        loginfo('Transmitted Successfully.');
        AdvancedTelemetry.prototype.clearPayload();
      }

      function retry(e) {
        // If the attempt to transmit a batch of data fails, refresh the payload
        loginfo('App usage metrics transmission failure:', e.type);
        self.getPayload();
      }

      request.send({
        timeout: AT.REPORT_TIMEOUT,
        onload: onload,
        onerror: retry,
        onabort: retry,
        ontimeout: retry
      });
    }
  };

  function AdvancedTelemetryPing(payload, deviceQuery) {
    if (!payload) {
      throw new Error('No arguments');
    }
    // clone so we don't put data into the object that was given to us
    this.packet = JSON.parse(JSON.stringify(payload));

    // URL format: /id/reason/appName/appVersion/appUpdateChannel/appBuildID?v=4
    var uriParts = [
      AT.REPORT_URL,
      encodeURIComponent(payload.id),
      encodeURIComponent(AT.REASON),
      encodeURIComponent(AT.TELEMETRY_APP_NAME),
      encodeURIComponent(deviceQuery['deviceinfo.platform_version']),
      encodeURIComponent(deviceQuery['app.update.channel']),
      encodeURIComponent(deviceQuery['deviceinfo.platform_build_id']),
    ];

    this.url = uriParts.join('/');
    this.url += ('?v=4');
    debug('Telemetry URL is: ' + this.url);
  }

  AdvancedTelemetryPing.prototype.send = function(xhrAttrs) {
    var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });

    xhr.open('POST', this.url);

    if (xhrAttrs && xhrAttrs.timeout) {
      xhr.timeout = xhrAttrs.timeout;
    }

    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.responseType = 'text';

    var data = JSON.stringify(this.packet);
    xhr.send(data);
    //TODO:  GZIP COMPRESS.

    if (xhrAttrs) {
      xhr.onload = xhrAttrs.onload;
      xhr.onerror = xhrAttrs.onerror;
      xhr.onabort = xhrAttrs.onabort;
      xhr.ontimeout = xhrAttrs.ontimeout;
    }

    return xhr;
  };

  /*
   * A helper class that tracks the start time of the current batch.
   */
  function BatchTiming(startup) {
    var self = this;
    this.start = Date.now();
    if (startup) {
      asyncStorage.getItem(AT.BATCH_KEY, function(value) {
        if (value) {
          var oldDate = new Date(value);
          self.interval = self.start - oldDate.getTime();
          if (self.interval > AT.REPORT_INTERVAL) {
            self.interval = AT.REPORT_INTERVAL;
            asyncStorage.setItem(AT.BATCH_KEY, self.start);
          }
        } else {
          // here if it's the first time it's being run and there is nothing
          // saved in async.
          asyncStorage.setItem(AT.BATCH_KEY, self.start);
          self.interval = AT.REPORT_INTERVAL;
        }
      });
    } else {
      asyncStorage.setItem(AT.BATCH_KEY, this.start);
      this.interval = AT.REPORT_INTERVAL;
    }
  }

  BatchTiming.prototype.startTime = function() {
    return this.start;
  };

  BatchTiming.prototype.getInterval = function(){
    return this.interval;
  };

  // The AdvancedTelemetry constructor is the single value we export.
  exports.AdvancedTelemetry = AdvancedTelemetry;
}(window));
