/* global asyncStorage, SettingsListener, performance, uuid*/
(function(exports) {
  'use strict';

  /*
   * Simple constants used in this module.
   */

  // This is the asyncStorage key we use to persist our app usage data so
  // that it survives across device restarts.
  const PERSISTENCE_KEY = 'metrics.advanced_telemetry.data.v2';

  // This is the asyncStorage key we use to persist our device ID
  // v1 of this ID used a randomly generated String, while v2 uses a UUID
  const DEVICE_ID_KEY = 'metrics.advanced_telemetry.deviceID.v2';

  // Various event types we use. Constants here to be sure we use the
  // same values when registering, unregistering and handling these.
  const IDLE = 'idle';
  const ACTIVE = 'active';
  const HUDMETRICS = 'advanced-telemetry-update';


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

  AT.HistogramData = HistogramData;


  /*
   * Exported and configurable properties. Properties of AT are visible
   * outside of the module and are exposed for unit testing and to enable
   * external configuration.
   */

  // Export the HistogramData class so we can test it independently

  // Set to true to to enable debug output
  AT.DEBUG = true;

  // This logging function is the only thing that is not exposed through
  // the AdvancedTelemetry contstructor or its instance.
  function debug(...args) {
    if (AT.DEBUG) {
      args.unshift('[AdvancedTelemetry]');
      console.log.apply(console, args);
    }
  }
  function tdebug(...args) {
      args.unshift('[TAMARA]');
      console.log.apply(console, args);
  }

  function debuglongLine(longLine) {
    var array = longLine.match(/.{1,1000}/g);
    array.forEach(function(value) {
      console.log(value);
    });
  }

  // What setting do we listen to to turn app usage metrics on or off.
  // This default value is the same setting that turns telemetry on and off.
  AT.TELEMETRY_ENABLED_KEY = 'debug.performance_data.advanced_telemetry';

  // Base URL for sending data reports
  // Can be overridden with metrics.appusage.reportURL setting.
  // Needs to be formatted as:
  // /submit/telemetry/id/reason/appName/appUpdateChannel/appVersion/appBuildID
  AT.REPORT_URL = 'https://incoming.telemetry.mozilla.org/submit/telemetry';
  //AT.REPORT_URL = 'http://10.19.2.10:4040/submit/telemetry';
  // How often do we try to send the reports
  // Can be overridden with metrics.appusage.reportInterval setting.
//  AT.REPORT_INTERVAL = 24 * 60 * 60 * 1000;  // 1 DAY
  AT.REPORT_INTERVAL = 2 * 60 * 1000;  // 1 DAY

  // If the telemetry server does not respond within this amount of time
  // just give up and try again later.
  // Can be overridden with metrics.appusage.reportTimeout setting.
  AT.REPORT_TIMEOUT = 20 * 1000;             // 20 seconds

  // If sending a report fails (even though the we're online) how
  // long do we wait before trying it again?
  // Can be overridden with metrics.appusage.retryTimeout setting.
  AT.RETRY_INTERVAL = 60 * 60 * 1000;        // 1 hour

  // How much user idle time (in seconds, not ms) do we wait for before
  // persisting our data to asyncStorage or trying to transmit it.
  AT.IDLE_TIME = 5;                          // seconds

  // Telemetry payload version
  AT.TELEMETRY_VERSION = 1;

  // App name (static for Telemetry)
  AT.TELEMETRY_APP_NAME = 'FirefoxOS';


  AT.prototype.start = function start() {
    this.advancedTelemetryEnabledListener =
    function advancedTelemetryEnabledListener(enabled) {
      debug('advancedTelemetryEnabledListener, enabled: ' + enabled);
      if (enabled) {
        debug('calling startCollecting');
        this.startCollecting();
      }
//      else {
//        this.stopCollecting();
//      }
    }.bind(this);

    SettingsListener.observe(AT.TELEMETRY_ENABLED_KEY,
      false, this.advancedTelemetryEnabledListener);
  };

  AT.prototype.startCollecting = function startCollecting(done) {
    debug('inside of startCollecting');
    var self = this;
    this.metrics = null;
    // If we're already running there is nothing to start
    if (this.collecting) {
      return;
    }
    this.collecting = true;


    loadData();
    function loadData() {
      debug('inside of loadData');
      HistogramData.load(function(loadedMetrics) {
        debug('inside of loadedMetrics');
        self.metrics = loadedMetrics;
        getDeviceID();
      });
    }

    debug('starting app usage metrics collection');

    function getDeviceID() {
      debug('inside getDeviceId');
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
        getConfigurationSettings();
      });
    }

    function getConfigurationSettings() {
      debug('inside getConfigurationSettings');
      // Settings to query, mapped to default values
//      var query = {
//        'metrics.appusage.retryInterval': AUM.RETRY_INTERVAL
//      };
//
//      AUM.getSettings(query, function (result) {
//        AUM.RETRY_INTERVAL = result['metrics.appusage.retryInterval'];
//      });
      debug('CALLING REGISTERHANDLERS');
      registerHandlers();
    }

    function registerHandlers() {
      // Basic event handlers
      debug('inside registerHandlers');
      EVENT_TYPES.forEach(function (type) {
        debug('REGISTERHANDLE: ' + type);
        window.addEventListener(type, self);
      });

      self.idleObserver = {
        time: AT.IDLE_TIME,
        onidle: function () {
          self.handleEvent(new CustomEvent(IDLE));
        },
        onactive: function () {
          self.handleEvent(new CustomEvent(ACTIVE));
        }
      };

      // Register for idle events
      navigator.addIdleObserver(self.idleObserver);

      if (done) {
        done();
      }
    }
  };

  // This method shuts everything down and is only exposed for unit testing.
  // Note that this is not the same as the stopCollecting() method which is
  // used to stop data collection but keep the module running.
  AT.prototype.stop = function stop() {

  };

  // Reset (or initialize) the AdvancedTelemetry instance variables
  AT.prototype.reset = function() {
  };

  AT.prototype.handleEvent = function handleEvent(e) {
    switch (e.type) {
      case IDLE:
        this.idle = true;
        break;
      case ACTIVE:
        this.idle = false;
        break;
      case HUDMETRICS:
        debug('GOT A HUDMETRICS: ' + JSON.stringify(e.detail));
        this.metrics.add(e.detail);
        break;
      default:
        break;
    }

    // If we're idle, persist the metrics
    if (this.idle) {
      this.metrics.save(); // Doesn't do anything if metrics have not changed
    }

    // Is there data to be sent and is this an okay time to send it?
    if (!this.metrics.isEmpty() && this.idle && navigator.onLine) {
      var absoluteTime = Date.now();
      // Have we tried and failed to send it before?
/*      if (this.lastFailedTransmission > this.metrics.startTime()) {

        // If so, then send it if the retry interval has elapsed
        if (absoluteTime - this.lastFailedTransmission > AT.RETRY_INTERVAL) {
          this.transmit();
        }
      }*/
      // Otherwise, if we have not failed to transmit, then send it if the
      // reporting interval has elapsed.
      /* else */
      if (absoluteTime - this.metrics.startTime() > AT.REPORT_INTERVAL) {
        this.transmit();
      }
    }
  };

  // Transmit the current batch of metrics to the metrics server.
  // Start a new batch of data. If the transmission fails, merge the
  // new batch with the failed batch so we can try again later.
  AT.prototype.transmit = function transmit() {
    tdebug('TAMARA TIME TO TRANSMIT');
    var self = this;

    if (!this.collecting) {
      return;
    }

    // Make a private copy of the metrics data we're going to transmit
//    var data = JSON.parse(JSON.stringify(this.metrics.data));

    // Remember the existing metrics in case transmission fails
//    var oldMetrics = this.metrics;
    var payload = this.metrics.packHistograms();
    tdebug('TAMARA PAYLOAD IS: ' );
    debuglongLine(JSON.stringify(payload));

    // But assume that it will succeed and start collecting new metrics now
    this.metrics = new HistogramData();

    // Erase the old data by forcing this new empty batch to be saved.
    // This means that if the phone crashes or is switched off before we
    // transmit the data this batch of data will be lost. That is unlikely
    // to happen and data transmission is optional, so it is not worth
    // the extra effort to design something more robust.
    this.metrics.save(true);

    var deviceInfoQuery = {
      'deviceinfo.hardware': 'unknown',
      'app.update.channel': 'unknown',
      'deviceinfo.platform_version': 'unknown',
      'deviceinfo.platform_build_id': 'unknown'
    };


    // Query the settings db for parameters for hte URL
    AT.getSettings(deviceInfoQuery, function(deviceResponse) {
      var wrapper = {
        version: 4,

        info: {
          reason: 'daily', // what triggered this ping:
          revision: '1', // the Histograms.json revision
          timezoneOffset: new Date().getTimezoneOffset(),
          previousBuildId: '',
          sessionId: self.deviceID,
          subsessionId: uuid(),  // random subsession id
          previousSessionId: null,
          previousSubsessionId: null,
          // null on first run.
          subsessionCounter: 0,
          profileSubsessionCounter: 0,
          sessionStartDate: new Date().toISOString(), // daily precision
          subsessionStartDate: new Date().toISOString(),
          subsessionLength: 0 // the subsession length in seconds
        },

        childPayloads: {},

        simpleMeasurements: {},
        gaiahistograms: payload,
        histograms: {},
        keyedHistograms: {},
        chromeHangs: {},
        threadHangStats: {},
        log: [],
        fileIOReports: {},
        lateWrites: {},
        addonDetails: {},
        addonHistograms: {},
        UIMeasurements: {},
        slowSQL: {},
        slowSQLstartup: {}
      };

      tdebug('TAMARA whole thing is IS: ' );
      debuglongLine(JSON.stringify(wrapper));


      // Build the wrapper for the telemetry version
      send(wrapper, deviceResponse);
      // Now transmit the data
    });

    function send(payload, deviceInfoQuery) {
      tdebug('TAMARA: CALLING SEND');

      var request = new AdvancedTelemetryPing(payload, deviceInfoQuery,
                                              self.deviceID);

      // We don't actually have to do anything if the data is transmitted
      // successfully. We are already set up to collect the next batch of data.
      function onload() {
        tdebug('Transmitted app usage data to');
      }

      function retry(e) {
        // If the attempt to transmit a batch of data fails, we'll merge
        // the new batch of data (which may be empty) in with the old one
        // and resave everything so we can try again later. We also record
        // the time of this failure so we don't try sending again too soon.
        tdebug('App usage metrics transmission failure:', e.type);

        // We use absolute time here because we will be comparing to
        // the absolute batch start time.
//        self.lastFailedTransmission = Date.now();
//        oldMetrics.merge(self.metrics);
//        self.metrics = oldMetrics;
//        self.metrics.save(true);
      }
      console.log('TAMARA: BEFORE CALLING SEND');

      request.send({
        timeout: AT.REPORT_TIMEOUT,
        onload: onload,
        onerror: retry,
        onabort: retry,
        ontimeout: retry
      });
    }
  };

  function AdvancedTelemetryPing(payload, deviceQuery, did) {
    if (!payload) {
      throw new Error('No arguments');
    }
    // clone so we don't put data into the object that was given to us
    this.packet = payload;
    tdebug('ENTERING CTOR');

    // /id/reason/appName/appUpdateChannel/appVersion/appBuildID
    var uriParts = [
        AT.REPORT_URL,
      encodeURIComponent(did),
      encodeURIComponent('advancedtelemetry'),
      encodeURIComponent(AT.TELEMETRY_APP_NAME),
      encodeURIComponent(deviceQuery['app.update.channel']),
      encodeURIComponent(deviceQuery['deviceinfo.platform_version']),
      encodeURIComponent(deviceQuery['deviceinfo.platform_build_id'])
    ];

    this.url = uriParts.join('/');
    tdebug('TAMARA URL IS: ' + this.url);
  }

  AdvancedTelemetryPing.prototype.send = function(xhrAttrs) {
    var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
    tdebug('TAMARA:  INSIDE SEND');

    xhr.open('POST', this.url);
    tdebug(this.url);

    if (xhrAttrs && xhrAttrs.timeout) {
      xhr.timeout = xhrAttrs.timeout;
    }

    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.responseType = 'text';

    var data = JSON.stringify(this.packet);
    xhr.send(data);
    //TODO:  GZIP COMPRESS.
    tdebug(data);

    if (xhrAttrs) {
      xhr.onload = xhrAttrs.onload;
      xhr.onerror = xhrAttrs.onerror;
      xhr.onabort = xhrAttrs.onabort;
      xhr.ontimeout = xhrAttrs.ontimeout;
    }

    return xhr;
  };

  /*
   * A utility function get values for all of the specified settings.
   * settingKeysAndDefaults is an object that maps settings keys to default
   * values. We query the value of each of those settings and then create an
   * object that maps keys to values (or to the default values) and pass
   * that object to the callback function.
   */
  AT.getSettings = function getSettings(settingKeysAndDefaults, callback) {
    var pendingQueries = 0;
    var results = {};
    var lock = window.navigator.mozSettings.createLock();
    for (var key in settingKeysAndDefaults) {
      var defaultValue = settingKeysAndDefaults[key];
      query(key, defaultValue);
      pendingQueries++;
    }

    function query(key, defaultValue) {
      var request = lock.get(key);
      request.onsuccess = function() {
        var value = request.result[key];
        if (value === undefined || value === null) {
          value = defaultValue;
        }
        results[key] = value;
        pendingQueries--;
        if (pendingQueries === 0) {
          callback(results);
        }
      };
    }
  };

  /*
   * A helper class that holds (and persists) a batch of app usage data
   */
  function HistogramData() {
    this.data = {
      start: Date.now(),
      histograms: new Map() // Maps app URLs to usage data
    };
    this.needsSave = false;
    // Record the relative start time, which we can use to adjust
    // this.data.start if we get a moztimechange event.
    this.relativeStartTime = performance.now();
  }

  HistogramData.prototype.isEmpty = function() {
    return this.data.histograms.size === 0;
  };

  HistogramData.load = function(callback) {
    asyncStorage.getItem(PERSISTENCE_KEY, function(data) {
      var usage = new HistogramData();
//      if (data) {
//        usage.data = data;
//        Handle a scenario with old app data that does not have searches
//        if (typeof usage.data.searches === 'undefined') {
//          usage.data.searches = {};
//        }
//
//        If we loaded persisted data, then the absolute start time can
        // and should no longer be adjusted. So remove the relative time.
//        delete usage.relativeStartTime;
//      }
      callback(usage);
    });
  };

  HistogramData.prototype.add = function(ed) {
    //The key name is composite of: <app>_<category>
    var key = ed.metric.appName.concat('_', ed.metric.name);
    var value = ed.metric.value;
    debug('adding metric, key: ' + key + ', value: ' + value);
    switch (ed.metric.name) {
      case 'uss':
        this.addUssValue(key, value);
        break;
      case 'jank':
        this.addJankValue(key, value);
        break;
      case 'reflows':
        this.addReflowsValue(key, value);
        break;
      case 'reflow-duration':
        this.addReflowDurationValue(key, value);
        break;
      case 'security':
        this.addSecurityValue(key, value);
        break;
      case 'errors':
      case 'warnings':
        this.addErrorWarningCount(key, value);
        break;
      case 'ttl-cold-start':
        this.addColdStartupTime(key, value);
        break;
      case 'ttl-warm-start':
        this.addWarmStartupTime(key, value);
        break;
      default:
        this.addAppHistogram(key, value);
        break;
    }
//    this.needsSave = true;
  };

  HistogramData.prototype.addAppHistogram = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      histValue.values++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {
        'values': 0,
        'histogram_type': 4
      };

      newValue.values++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR APP:' +
        key + JSON.stringify(newValue));
    }
  };

  HistogramData.prototype.addWarmStartupTime = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      // Broke the memory into ten buckets 1-1000 ms e.
      histValue.values[(Math.floor((value/100)) -1)]++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {'sum_squares_hi': 0,
        'sum_squares_lo': 1,
        'sum': 0,
        'values': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        'histogram_type': 1,
        'bucket_count': 10,
        'range': [0,1000]};

      newValue.values[(Math.floor((value/100)) -1)]++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR WARM STARTUP:' + key +
        JSON.stringify(newValue));
    }
  };

  HistogramData.prototype.addColdStartupTime = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      // Broke the memory into ten buckets 1-1000 ms e.
      histValue.values[(Math.floor((value/1000)) -1)]++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {'sum_squares_hi': 0,
        'sum_squares_lo': 1,
        'sum': 0,
        'values': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        'histogram_type': 1,
        'bucket_count': 10,
        'range': [0,1000]};

      newValue.values[(Math.floor((value/1000)) -1)]++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR COLD STARTUP:' + key +
        JSON.stringify(newValue));
    }
  };

  HistogramData.prototype.addSecurityValue = function(key, value) {
    var security = [
      'Mixed Content Blocker',
      'Mixed Content Message',
      'CSP',
      'Invalid HSTS Headers',
      'Invalid HPKP Headers',
      'Insecure Password Field',
      'SSL',
      'CORS'
    ];
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      // We just map the security array values to the values in the histogram
      // buckets for convenience.
      histValue.values[security.indexOf(value)]++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {'sum_squares_hi': 0,
        'sum_squares_lo': 1,
        'sum': 0,
        'values': [0, 0, 0, 0, 0, 0, 0, 0],
        'histogram_type': 1,
        'bucket_count': 8,
        'range': [0,300]};

      newValue.values[security.indexOf(value)]++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR SECURITY:' +
        key + JSON.stringify(newValue));
    }
  };

  HistogramData.prototype.addErrorWarningCount = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      histValue.values++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {
        'values': 0,
        'histogram_type': 4
      };

      newValue.values++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR ERRORSWARNINGS:' +
        key + JSON.stringify(newValue));
    }
  };

  HistogramData.prototype.addReflowsValue = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      // Broke the memory into ten buckets 1-30 each.
      histValue.values[(Math.floor((value/30)) -1)]++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {'sum_squares_hi': 0,
        'sum_squares_lo': 1,
        'sum': 0,
        'values': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        'histogram_type': 1,
        'bucket_count': 10,
        'range': [0,300]};

      newValue.values[(Math.floor((value/100)) -1)]++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR REFLOWS:' +
        key + JSON.stringify(newValue));
    }
    debug('Added a value for REFLOWS: ' + value);
  };

  HistogramData.prototype.addReflowDurationValue = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      // Broke the memory into ten buckets 1-300 MB each.
      histValue.values[(Math.floor((value/300)) -1)]++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {'sum_squares_hi': 0,
        'sum_squares_lo': 1,
        'sum': 0,
        'values': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        'histogram_type': 1,
        'bucket_count': 10,
        'range': [0,300]};

      newValue.values[(Math.floor((value/300)) -1)]++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR REFLOW DURATION:' + 
        key + JSON.stringify(newValue));
    }
    debug('Added a value for REFLOW DURATION: ' + value);
  };

  HistogramData.prototype.addJankValue = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      // Broke the memory into ten buckets 1-100 MB each.
      histValue.values[(Math.floor((value/100)) -1)]++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {'sum_squares_hi': 0,
        'sum_squares_lo': 1,
        'sum': 0,
        'values': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        'histogram_type': 1,
        'bucket_count': 10,
        'range': [0,100]};

      newValue.values[(Math.floor((value/100)) -1)]++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR JANK:' + key + JSON.stringify(newValue));
    }
  };

  HistogramData.prototype.addUssValue = function(key, value) {
    var histValue = this.data.histograms.get(key, value);
    if (histValue) {
      // Broke the memory into ten buckets 1-100 MB each.
      histValue.values[(Math.floor((value/1048576)/10) -1)]++;
      this.data.histograms.set(key, histValue);
    } else {
      var newValue = {'sum_squares_hi': 0,
                      'sum_squares_lo': 1,
                      'sum': 0,
                      'values': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                      'histogram_type': 1,
                      'bucket_count': 10,
                      'range': [0,100]};

      newValue.values[(Math.floor((value/1048576)/10) -1)]++;
      this.data.histograms.set(key, newValue);
      debug('ADDED A NEW HISTOGRAM FOR USS:' + key + JSON.stringify(newValue));
    }
  };

  // Persist the current batch of metrics so we don't lose it if the user
  // switches the phone off.
  HistogramData.prototype.save = function(force) {
//    if (force || this.needsSave) {
//      asyncStorage.setItem(PERSISTENCE_KEY, this.data);
//      this.needsSave = false;
//      debug('Saved advanced telemetry data');
//    }
  };

  HistogramData.prototype.packHistograms = function() {
    var histogramData = {};

    this.data.histograms.forEach(function(value, key) {
      console.log('TAMARA: KEY: ' + key);
      histogramData[key] = value;
    });
    return histogramData;
  };

  HistogramData.prototype.startTime = function() {
    return this.data.start;
  };

  // The AdvancedTelemetry constructor is the single value we export.
  exports.AdvancedTelemetry = AdvancedTelemetry;
}(window));
