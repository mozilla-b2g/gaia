/**
 * This module records app usage data (aggregate time used, number of
 * invocations an uninstalls) for all apps on the phone and periodically
 * transmits that data to Mozilla's telemetry server.
 *
 * Data is only collected and transmitted if the user opts in to telemetry
 * in the FTU or Settings app.
 *
 * Known issues:
 *
 *  The lockscreen does not generate any events when the user launches the
 *  camera from a locked lockscreen, so any time spent using the camera app
 *  from the lockscreen will be recorded as time on the lockscreen
 *
 *  We would like to be able to record OOMs and similar app failures but
 *  the system app window management code does not seem to distinguish
 *  normal app termination from abnormal and I can't figure out any way
 *  to tell when an app has crashed.
 */
/* global asyncStorage, SettingsListener */
(function(exports) {
  'use strict';

  /*
   * Simple constants used in this module.
   */

  // This is the asyncStorage key we use to persist our app usage data so
  // that it survives across device restarts.
  const PERSISTENCE_KEY = 'metrics.app_usage.data';

  // This is the asyncStorage key we use to persist our device ID
  const DEVICE_ID_KEY = 'metrics.app_usage.deviceID';

  // Various event types we use. Constants here to be sure we use the
  // same values when registering, unregistering and handling these.
  const APPOPENED = 'appopened';
  const HOMESCREEN = 'homescreenopened';
  const ACTIVITY = 'activitycreated';
  const LOCKED = 'lockscreen-appopened';    // In 2.0, use 'locked'
  const UNLOCKED = 'lockscreen-appclosed';  // In 2.0, use 'unlocked'
  const SCREENCHANGE = 'screenchange';      // sleep or wake
  const INSTALL = 'applicationinstall';
  const UNINSTALL = 'applicationuninstall';
  const ONLINE = 'online';
  const OFFLINE = 'offline';
  const IDLE = 'idle';
  const ACTIVE = 'active';

  // This is the list of event types we register handlers for
  const EVENT_TYPES = [
    APPOPENED,
    HOMESCREEN,
    ACTIVITY,
    LOCKED,
    UNLOCKED,
    SCREENCHANGE,
    INSTALL,
    UNINSTALL,
    ONLINE,
    OFFLINE
  ];


  // This AppUsageMetrics() constructor is the value we export from
  // this module. This constructor does no initialization itself: that
  // is all done in the start() instance method. See bootstrap.js for
  // the code that actually calls the constructor and the start method.
  function AppUsageMetrics() {}

  // We use the acronym AUM internally to save typing and make
  // references to class variables and constants more legible.
  const AUM = AppUsageMetrics;

  /*
   * Exported and configurable properties. Properties of AUM are visible
   * outside of the module and are exposed for unit testing and to enable
   * external configuration.
   */

  // Export the UsageData class so we can test it independently
  AUM.UsageData = UsageData;

  // Set to false to silence debug output
  AUM.DEBUG = true;

  // This logging function is the only thing that is not exposed through
  // the AppUsageMetrics contstructor or its instance.
  function debug(...args) {
    if (AUM.DEBUG) {
      args.unshift('[AppUsage]');
      console.log.apply(console, args);
    }
  }

  // What setting do we listen to to turn app usage metrics on or off.
  // This default value is the same setting that turns telemetry on and off.
  AUM.TELEMETRY_ENABLED_KEY = 'debug.performance_data.shared';

  // Where do we send our data reports
  // Can be overridden with metrics.appusage.reportURL setting.
  AUM.REPORT_URL =
    'https://fxos.telemetry.mozilla.org/submit/telemetry' +
    '/metrics/FirefoxOS/appusage';

  // How often do we try to send the reports
  // Can be overridden with metrics.appusage.reportInterval setting.
  AUM.REPORT_INTERVAL = 24 * 60 * 60 * 1000;  // 1 day

  // If the telemetry server does not respond within this amount of time
  // just give up and try again later.
  // Can be overridden with metrics.appusage.reportTimeout setting.
  AUM.REPORT_TIMEOUT = 20 * 1000;             // 20 seconds

  // If sending a report fails (even though the we're online) how
  // long do we wait before trying it again?
  // Can be overridden with metrics.appusage.retryTimeout setting.
  AUM.RETRY_INTERVAL = 60 * 60 * 1000;        // 1 hour

  // How much user idle time (in seconds, not ms) do we wait for before
  // persisting our data to asyncStorage or trying to transmit it.
  AUM.IDLE_TIME = 5;                          // seconds

  /*
   * AppUsageMetrics instance methods
   */

  //
  // The AppUsageMetrics constructor does no initialization of any sort.
  // By system app convention, the initialization code is in this start()
  // instance method instead. Note that this is not the same as the
  // startCollecting() method which is only called if the user has actually
  // opted in to telemetry.
  //
  AUM.prototype.start = function start() {
    this.reset();  // initialize our state variables

    // Query and listen for changes on the telemetry setting. Start data
    // collection if or when it becomes set, and stop data collection if
    // it is not set. Note that we do very little initialization here.
    // That happens in the startCollecting() method which is only called if
    // telemetry is actually enabled
    this.metricsEnabledListener = function metricsEnabledListener(enabled) {
      if (enabled) {
        this.startCollecting();
      }
      else {
        this.stopCollecting();
      }
    }.bind(this);

    SettingsListener.observe(AUM.TELEMETRY_ENABLED_KEY,
                             false, this.metricsEnabledListener);

    // Return this so we can write |var aum = new AppUsageMetrics().start();|
    return this;
  };

  // This method shuts everything down and is only exposed for unit testing.
  // Note that this is not the same as the stopCollecting() method which is
  // used to stop data collection but keep the module running.
  AUM.prototype.stop = function stop() {
    this.stopCollecting();
    SettingsListener.unobserve(AUM.TELEMETRY_ENABLED_KEY,
                               this.metricsEnabledListener);
  };

  // Reset (or initialize) the AppUsageMetrics instance variables
  AUM.prototype.reset = function() {
    // Are we collecting data? This is set to true by startCollecting()
    // and set to false by stopCollecting()
    this.collecting = false;

    // The UsageData object we're currently collecting data in, or
    // null if we're not collecting anything. Initialized in startCollecting()
    // Note that this object includes a start time for the batch so we know
    // how old it is.
    this.metrics = null;

    // This is the unique string we send with each batch of data so that
    // batches can be linked together into larger time periods
    this.deviceID = null;

    // Are we online? Initialized in startCollecting() and updated in
    // handleEvent() based on online and offline events
    this.online = false;

    // Is the user idle? Updated in handleEvent() based on an idle observer
    this.idle = false;

    // Is the lockscreen running?
    this.locked = false;

    // What is the URL of the lockscreen app?
    this.lockscreenURL = null;

    // When was the last time that a transmission attempt failed.
    // This is used along with the retry interval.
    this.lastFailedTransmission = 0;

    // This is the URL of the app that the user is currently using. We determine
    // this from appopened events and homescreenopened events. Note that we
    // don't change this variable when the lockscreen is displayed, we just set
    // the locked variable.
    this.currentApp = null;

    // When did the currently running app start?
    this.currentAppStartTime = 0;
  };

  // Start collecting app usage data. This function is only called if the
  // appropriate setting is turned on. The done callback is called when
  // setup is complete, but this feature is only needed for tests.
  AUM.prototype.startCollecting = function startCollecting(done) {
    var self = this;

    debug('starting app usage metrics collection');

    // If we're already running there is nothing to start
    if (this.collecting) {
      return;
    }
    this.collecting = true;

    // Begin the startup process by loading data.
    loadData();

    // Step 1: load any persisted app usage data
    function loadData() {
      // This loads existing data or creates a new object if no data is saved.
      // We store it in the metrics variable that makes it visible throughout
      // the module
      UsageData.load(function(loadedMetrics) {
        // Remember the metrics data
        self.metrics = loadedMetrics;

        // Now move on to step two in the startup process
        getDeviceID();
      });
    }

    // Step 2: Look up, or generate a unique identifier for this device
    // so that the periodic metrics reports we send can be linked together
    // to allow analysis over a longer period of time. If the user ever turns
    // off telemetry we will delete this id, so that if it is turned back
    // on, they start off with a clean history
    function getDeviceID() {
      asyncStorage.getItem(DEVICE_ID_KEY, function(value) {
        if (value) {
          self.deviceID = value;
        }
        else {
          // Our device id does not need to be unique, just probably unique.
          // And it doesn't even need to be a real UUID
          self.deviceID = Math.random().toString(36).substring(2, 10);
          asyncStorage.setItem(DEVICE_ID_KEY, self.deviceID);
        }

        // Move on to the next step in the startup process
        getConfigurationSettings();
      });
    }

    // Step 3: Configure the server url and other variables by
    // allowing values in the settings database to override the defaults.
    function getConfigurationSettings() {
      // Settings to query, mapped to default values
      var query = {
        'metrics.appusage.reportURL': AUM.REPORT_URL,
        'metrics.appusage.reportInterval': AUM.REPORT_INTERVAL,
        'metrics.appusage.reportTimeout': AUM.REPORT_TIMEOUT,
        'metrics.appusage.retryInterval': AUM.RETRY_INTERVAL
      };

      AUM.getSettings(query, function(result) {
        AUM.REPORT_URL = result['metrics.appusage.reportURL'];
        AUM.REPORT_INTERVAL = result['metrics.appusage.reportInterval'];
        AUM.REPORT_TIMEOUT = result['metrics.appusage.reportTimeout'];
        AUM.RETRY_INTERVAL = result['metrics.appusage.retryInterval'];

        // Move on to the next step in the startup process
        registerHandlers();
      });
    }

    // Step 4: register the various event handlers we need
    function registerHandlers() {
      // Basic event handlers
      EVENT_TYPES.forEach(function(type) {
        window.addEventListener(type, self);
      });

      self.idleObserver = {
        time: AUM.IDLE_TIME,
        onidle: function() { self.handleEvent(new CustomEvent(IDLE)); },
        onactive: function() { self.handleEvent(new CustomEvent(ACTIVE)); }
      };

      // Register for idle events
      navigator.addIdleObserver(self.idleObserver);

      if (done) {
        done();
      }
    }
  };

  // Stop collecting app usage data and discard any we have already collected.
  // This is called if the setting is turned off.
  AUM.prototype.stopCollecting = function stopCollecting() {
    debug('stopping app usage data collection and deleting stored data');

    // If we're not already running there is nothing to stop
    if (!this.collecting) {
      return;
    }
    this.collecting = false;

    // Delete stored data and our device id
    asyncStorage.removeItem(PERSISTENCE_KEY);
    asyncStorage.removeItem(DEVICE_ID_KEY);

    // Stop listening to all events
    navigator.removeIdleObserver(this.idleObserver);
    this.idleObserver = null;

    var self = this;
    EVENT_TYPES.forEach(function(type) {
      window.removeEventListener(type, self);
    });

    // Reset our state, discarding local copies of metrics and deviceID
    this.reset();
  };

  //
  // This is the heart of this module. It listens to the various events and
  // 1) records app usage data
  // 2) persists app usage data at appropriate times
  // 3) transmits app usage data at appropriate times
  //
  AUM.prototype.handleEvent = function handleEvent(e) {
    var now = Date.now();

    switch (e.type) {

    case APPOPENED:
    case HOMESCREEN:
      // The user has opened an app, switched apps, or switched to the
      // homescreen. Record data about the app that was running and then
      // update the currently running app.
      this.metrics.recordInvocation(this.currentApp,
                                    now - this.currentAppStartTime);
      this.currentApp = e.detail.origin;
      this.currentAppStartTime = now;
      break;

    case ACTIVITY:
      // If the current app launches an inline activity we record that
      // and maintain a count of how many times each activity (by url)
      // has been invoked by this app. This will give us interesting data
      // about which apps use which other apps. Note that we do not track
      // the amount of time the user spends in the activity handler.
      this.metrics.recordActivity(this.currentApp, e.detail.url);
      break;

    case LOCKED:
      // Record the time we ran the app, but keep the app the same
      // because we'll be back to it when the lockscreen is unlocked.
      // Note that if the lockscreen is disabled we won't get this event
      // and will just go straight to the screenchange event. In that
      // case we have to record the invocation when we get that event
      this.metrics.recordInvocation(this.currentApp,
                                    now - this.currentAppStartTime);
      this.currentAppStartTime = now;

      // Remember that the lockscreen is active. When we wake up again
      // we need to know this to know whether the user is at the lockscreen
      // or at the current app.
      this.locked = true;

      // In version 2.1 we use lockscreen-appopened events and get a real URL
      // In 2.0 and before we just use a locked event and don't get the url
      this.lockscreenURL = (e.detail && e.detail.origin) || 'lockscreen';
      break;

    case UNLOCKED:
      // If the lockscreen was started when the phone went to sleep, then
      // when we wake up we note the time and when we get this event, we
      // record the time spent on the lockscreen.
      if (this.locked && this.lockscreenURL) {
        this.metrics.recordInvocation(this.lockscreenURL,
                                      now - this.currentAppStartTime);

        // We left the currentApp unchanged when the phone went to sleep
        // so now that we're leaving the lock screen we will be back at whatever
        // app or homescreen we left. We just have to start timing again
        this.currentAppStartTime = now;
      }
      this.locked = false;
      break;

    case SCREENCHANGE:
      if (e.detail.screenEnabled) {
        // We just woke up. Note the time. This will be used for recording
        // time on the lockscreen if we're locked or time at the old app.
        this.currentAppStartTime = now;
      }
      else {
        // We're going to sleep. If the lockscreen is disabled and we went
        // directly to sleep then record the invocation of the current app.
        // Otherwise, we already recorded that when we got the locked event
        // so now we record lockscreen time. Typically there is just a
        // fraction of a second between the LOCKED and SCREENCHANGE events
        // and the data gets discarded because the time is too short. But
        // if the user wakes the phone up and never unlocks it and then
        // we time out again, we need to record lockscreen time here,
        // not current app time.
        var appurl = this.locked ? this.lockscreenURL : this.currentApp;
        this.metrics.recordInvocation(appurl, now - this.currentAppStartTime);
      }
      break;

    case INSTALL:
      this.metrics.recordInstall(e.detail.application.origin);
      break;

    case UNINSTALL:
      this.metrics.recordUninstall(e.detail.application.origin);
      break;

    case IDLE:
      this.idle = true;
      break;

    case ACTIVE:
      this.idle = false;
      break;

    case ONLINE:
      this.online = true;
      break;

    case OFFLINE:
      this.online = false;
      break;
    }

    /*
     * We've updated our state based on the events. Now see whether we should
     * save or transmit the data.
     */

    // If we're idle, persist the metrics
    if (this.idle) {
      this.metrics.save(); // Doesn't do anything if metrics have not changed
    }

    // Is there data to be sent and is this an okay time to send it?
    if (!this.metrics.isEmpty() && this.idle && this.online) {
      // Have we tried and failed to send it before?
      if (this.lastFailedTransmission > this.metrics.startTime()) {

        // If so, then send it if the retry interval has elapsed
        if (now - this.lastFailedTransmission > AUM.RETRY_INTERVAL) {
          this.transmit();
        }
      }
      // Otherwise, if we have not failed to transmit, then send it if the
      // reporting interval has elapsed.
      else if (now - this.metrics.startTime() > AUM.REPORT_INTERVAL) {
        this.transmit();
      }
    }
  };

  // Transmit the current batch of metrics to the metrics server.
  // Start a new batch of data. If the transmission fails, merge the
  // new batch with the failed batch so we can try again later.
  AUM.prototype.transmit = function transmit() {
    var self = this;

    if (!this.collecting) {
      return;
    }

    // Make a private copy of the metrics data we're going to transmit
    var data = JSON.parse(JSON.stringify(this.metrics.data));

    // Remember the existing metrics in case transmission fails
    var oldMetrics = this.metrics;

    // But assume that it will succeed and start collecting new metrics now
    this.metrics = new UsageData();

    // Erase the old data by forcing this new empty batch to be saved.
    // This means that if the phone crashes or is switched off before we
    // transmit the data this batch of data will be lost. That is unlikely
    // to happen and data transmission is optional, so it is not worth
    // the extra effort to design something more robust.
    this.metrics.save(true);

    // Add some extra data that we want to transmit. These are not things
    // that need to be persisted with the other data, so we just add it now.
    data.stop = Date.now();           // End of batch time; matches data.start
    data.deviceID = this.deviceID;    // Link to other batches
    data.locale = navigator.language; // Information about the user's language
    data.screen = {                   // Information about screen size
      width: screen.width,
      height: screen.height,
      devicePixelRatio: window.devicePixelRatio
    };

    var deviceInfoQuery = {
      'deviceinfo.update_channel': 'unknown',
      'deviceinfo.platform_version': 'unknown',
      'deviceinfo.platform_build_id': 'unknown',
      'developer.menu.enabled': false // If true, data is probably an outlier
    };

    // Query the settings db to get some more device-specific information
    AUM.getSettings(deviceInfoQuery, function(deviceinfo) {
      data.deviceinfo = deviceinfo;
      // Now transmit the data
      send(data);
    });

    function send(data) {
      var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
      xhr.open('POST', AUM.REPORT_URL);
      xhr.timeout = AUM.REPORT_TIMEOUT;
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.responseType = 'text';
      xhr.send(JSON.stringify(data));

      // We don't actually have to do anything if the data is transmitted
      // successfully. We are already set up to collect the next batch of data.
      xhr.onload = function() {
        debug('Transmitted app usage data to', AUM.REPORT_URL);
      };

      xhr.onerror = xhr.onabort = xhr.ontimeout = function retry(e) {
        // If the attempt to transmit a batch of data fails, we'll merge
        // the new batch of data (which may be empty) in with the old one
        // and resave everything so we can try again later. We also record
        // the time of this failure so we don't try sending again too soon.
        debug('App usage metrics transmission failure:', e.type);

        self.lastFailedTransmission = Date.now();
        oldMetrics.merge(self.metrics);
        self.metrics = oldMetrics;
        self.metrics.save(true);
      };
    }
  };

  /*
   * A helper class that holds (and persists) a batch of app usage data
   */
  function UsageData() {
    this.data = {
      start: Date.now(),
      apps: {} // Maps app URLs to usage data
    };
    this.needsSave = false;
  }

  UsageData.prototype.getAppUsage = function(app) {
    var usage = this.data.apps[app];
    if (!usage) {
      // If no usage exists for this app, create a new empty object for it.
      usage = {
        usageTime: 0,
        invocations: 0,
        installs: 0,
        uninstalls: 0,
        activities: {}
      };
      this.data.apps[app] = usage;
    }
    return usage;
  };

  UsageData.prototype.startTime = function() {
    return this.data.start;
  };

  UsageData.prototype.isEmpty = function() {
    return Object.keys(this.data.apps).length === 0;
  };

  UsageData.prototype.recordInvocation = function(app, time) {
    if (app == null) {
      return;
    }

    // Convert time to seconds and round to the nearest second.  If 0,
    // don't record anything. (This can happen when we go to the
    // lockscreen right before sleeping, for example.)
    time = Math.round(time / 1000);
    if (time > 0) {
      var usage = this.getAppUsage(app);
      usage.invocations++;
      usage.usageTime += time;
      this.needsSave = true;
      debug(app, 'ran for', time);
    }
  };

  UsageData.prototype.recordInstall = function(app) {
    if (app == null) {
      return;
    }

    var usage = this.getAppUsage(app);
    usage.installs++;
    this.needsSave = true;
    debug(app, 'installed');
  };

  UsageData.prototype.recordUninstall = function(app) {
    if (app == null) {
      return;
    }

    var usage = this.getAppUsage(app);
    usage.uninstalls++;
    this.needsSave = true;
    debug(app, 'uninstalled');
  };

  UsageData.prototype.recordActivity = function(app, url) {
    if (app == null) {
      return;
    }

    var usage = this.getAppUsage(app);
    var count = usage.activities[url] || 0;
    usage.activities[url] = ++count;
    this.needsSave = true;
    debug(app, 'invoked activity', url);
  };

  // Merge a newer batch of data into this older batch.
  // We use this to recover from metrics transmission failures
  UsageData.prototype.merge = function(newbatch) {
    // Since we transmit while the user is idle, often there will not be
    // any new data collected while we're trying to transmit and in that
    // case there is nothing to merge.
    if (!newbatch || newbatch.isEmpty()) {
      return;
    }

    // Otherwise, loop through all the apps that we have data for
    // in the new batch and merge the new usage data with the old
    // usage data.
    for (var app in newbatch.data.apps) {
      var newusage = newbatch.data.apps[app];
      var oldusage = this.getAppUsage(app);

      oldusage.usageTime += newusage.usageTime;
      oldusage.invocations += newusage.invocations;
      oldusage.installs += newusage.installs;
      oldusage.uninstalls += newusage.uninstalls;

      for (var url in newusage.activities) {
        var newcount = newusage.activities[url];
        var oldcount = oldusage.activities[url] || 0;
        oldusage.activities[url] = oldcount + newcount;
      }
    }
  };

  // Persist the current batch of metrics so we don't lose it if the user
  // switches the phone off.
  UsageData.prototype.save = function(force) {
    if (force || this.needsSave) {
      asyncStorage.setItem(PERSISTENCE_KEY, this.data);
      this.needsSave = false;
      debug('Saved app usage data');
    }
  };

  // Load the current metrics from persistant storage.
  // Note that this is an async factory method, not an instance method.
  UsageData.load = function(callback) {
    asyncStorage.getItem(PERSISTENCE_KEY, function(data) {
      var usage = new UsageData();
      if (data) {
        usage.data = data;
      }
      callback(usage);
    });
  };

  /*
   * A utility function get values for all of the specified settings.
   * settingKeysAndDefaults is an object that maps settings keys to default
   * values. We query the value of each of those settings and then create an
   * object that maps keys to values (or to the default values) and pass
   * that object to the callback function.
   */
  AUM.getSettings = function getSettings(settingKeysAndDefaults, callback) {
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

  // The AppUsageMetrics constructor is the single value we export.
  exports.AppUsageMetrics = AppUsageMetrics;
}(window));
