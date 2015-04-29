/**
 * This module records app usage data (aggregate time used, number of
 * invocations an uninstalls) for all apps on the phone and periodically
 * transmits that data to Mozilla's telemetry server.
 *
 * Data is only collected and transmitted if the user opts in to telemetry
 * in the FTU or Settings app.
 *
 * A note about time: Date.now() returns absolute time. It changes if the user
 * sets the time in the Settings app, and also can change via the NTP protocol
 * when the device connects to the internet. To avoid having changes in clock
 * time affect our app usage timing data we use performance.now() which
 * returns a relative time whose values do not change when the absolute time
 * changes. However, the batches of metrics we submit do include absolute
 * start and end times. For these times, we do need to use Date.now(), and for
 * values that are compared to the batch start time, we obviously have to
 * use absolute time as well. Note that only absolute time can be persisted
 * since the relative time epoch restarts each time the phone is rebooted.
 *
 * Sometimes on system startup, we see changes to the absolute time of
 * more than a day when we connect to the internet and adjust the time
 * with NTP. These large time changes can skew the batch start times
 * that we report and so this module includes code to adjust the batch
 * start time when the absolute time is changed. This can only be
 * done for fresh batches of metrics that we start ourselves--if we've
 * loaded a persisted batch of metrics, then the start time is from a
 * previous boot of the device and we cannot adjust it. Perhaps when
 * bug 1069863 is fixed we will not have these dramatic time changes when
 * we start up and we can remove the workaround.
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

/* global asyncStorage, SettingsListener, performance, SIMSlotManager,
          MobileOperator, uuid, TelemetryRequest, applications */
(function(exports) {
  'use strict';

  /*
   * Simple constants used in this module.
   */

  // This is the asyncStorage key we use to persist our app usage data so
  // that it survives across device restarts.
  const PERSISTENCE_KEY = 'metrics.app_usage.data.v2';

  // This is the asyncStorage key we use to persist our device ID
  // v1 of this ID used a randomly generated String, while v2 uses a UUID
  const DEVICE_ID_KEY = 'metrics.app_usage.deviceID.v2';

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
  const TIMECHANGE = 'moztimechange';
  const ATTENTIONOPENED = 'attentionopened';
  const ATTENTIONCLOSED = 'attentionclosed';
  const IDLE = 'idle';
  const ACTIVE = 'active';
  const IACMETRICS = 'iac-app-metrics';

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
    OFFLINE,
    TIMECHANGE,
    ATTENTIONOPENED,
    ATTENTIONCLOSED,
    IACMETRICS
  ];


  const MARKETPLACE_ORIGINS = ['https://marketplace.firefox.com'];

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

  // Set to true to to enable debug output
  AUM.DEBUG = false;

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

  // Base URL for sending data reports
  // Can be overridden with metrics.appusage.reportURL setting.
  AUM.REPORT_URL = 'https://fxos.telemetry.mozilla.org/submit/telemetry';

  // How often do we try to send the reports
  // Can be overridden with metrics.appusage.reportInterval setting.
  AUM.REPORT_INTERVAL = 14 * 24 * 60 * 60 * 1000;  // 2 weeks

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

  // Telemetry payload version
  AUM.TELEMETRY_VERSION = 1;

  // Telemetry "reason" field
  AUM.TELEMETRY_REASON = 'appusage';

  // App name (static for Telemetry)
  AUM.TELEMETRY_APP_NAME = 'FirefoxOS';

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

    // Is the user idle? Updated in handleEvent() based on an idle observer
    this.idle = false;

    // Is the lockscreen running?
    this.locked = false;

    // What is the URL of the lockscreen app?
    this.lockscreenApp = null;

    // A stack of attention window manifest URLs and start times
    this.attentionWindows = [];

    // When was the last time that a transmission attempt failed.
    // This is used along with the retry interval.
    this.lastFailedTransmission = 0;

    // This is the URL of the app that the user is currently using. We determine
    // this from appopened events and homescreenopened events. Note that we
    // don't change this variable when the lockscreen is displayed, we just set
    // the locked variable.
    this.currentApp = null;

    // When did the currently running app start?
    this.currentAppStartTime = performance.now();
  };

  AUM.prototype.getTopAttentionWindow = function getTopAttentionWindow() {
    return this.attentionWindows ?
      this.attentionWindows[this.attentionWindows.length - 1] :
      undefined;
  };

  AUM.prototype.getCurrentApp = function() {
    return !this.attentionWindows || this.attentionWindows.length === 0 ?
      this.currentApp : this.getTopAttentionWindow().app;
  };

  AUM.prototype.getCurrentStartTime = function() {
    return !this.attentionWindows || this.attentionWindows.length === 0 ?
      this.currentAppStartTime : this.getTopAttentionWindow().startTime;
  };

  AUM.prototype.setCurrentStartTime = function(time) {
    if (!this.attentionWindows || this.attentionWindows.length === 0) {
      this.currentAppStartTime = time;
    } else {
      this.getTopAttentionWindow().startTime = time;
    }
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
          self.deviceID = uuid();
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
        'ftu.pingURL': AUM.REPORT_URL,
        'metrics.appusage.reportURL': null,
        'metrics.appusage.reportInterval': AUM.REPORT_INTERVAL,
        'metrics.appusage.reportTimeout': AUM.REPORT_TIMEOUT,
        'metrics.appusage.retryInterval': AUM.RETRY_INTERVAL
      };

      AUM.getSettings(query, function(result) {
        AUM.REPORT_URL = result['metrics.appusage.reportURL'] ||
                         result['ftu.pingURL'];

        AUM.REPORT_INTERVAL = result['metrics.appusage.reportInterval'];
        AUM.REPORT_TIMEOUT = result['metrics.appusage.reportTimeout'];
        AUM.RETRY_INTERVAL = result['metrics.appusage.retryInterval'];

        // Move on to the next step in the startup process
        waitForApplicationsReady();
      });
    }

    // Step 4: Ensure the applications cache is ready
    function waitForApplicationsReady() {
      if (applications.ready) {
        registerHandlers();
        return;
      }

      debug('Waiting for applications to be ready');
      window.addEventListener('applicationready', function onAppsReady(evt) {
        window.removeEventListener(onAppsReady);
        registerHandlers();
      });
    }

    // Step 5: register the various event handlers we need
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
    var now = performance.now();
    debug('got an event: ', e.type);
    switch (e.type) {

    case APPOPENED:
    case HOMESCREEN:
      // The user has opened an app, switched apps, or switched to the
      // homescreen. Record data about the app that was running and then
      // update the currently running app.
      this.metrics.recordInvocation(this.getCurrentApp(),
                                    now - this.getCurrentStartTime());
      this.attentionWindows = [];
      this.currentApp = e.detail;
      this.currentAppStartTime = now;
      break;

    case ATTENTIONOPENED:
      // Push the current attention screen start time onto stack, and use
      // currentApp / currentAppStartTime when the stack is empty
      this.metrics.recordInvocation(this.getCurrentApp(),
                                    now - this.getCurrentStartTime());
      this.attentionWindows.push({
        app: e.detail,
        startTime: now
      });
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
      this.metrics.recordInvocation(this.getCurrentApp(),
                                    now - this.getCurrentStartTime());
      this.setCurrentStartTime(now);

      // Remember that the lockscreen is active. When we wake up again
      // we need to know this to know whether the user is at the lockscreen
      // or at the current app.
      this.locked = true;

      // In version 2.1 we use lockscreen-appopened events and get a real URL
      // In 2.0 and before we just use a locked event and don't get the url
      this.lockscreenApp = e.detail;
      break;

    case UNLOCKED:
      // If the lockscreen was started when the phone went to sleep, then
      // when we wake up we note the time and when we get this event, we
      // record the time spent on the lockscreen.
      if (this.locked && this.lockscreenApp) {
        this.metrics.recordInvocation(this.lockscreenApp,
                                      now - this.currentAppStartTime);

        // We left the currentApp unchanged when the phone went to sleep
        // so now that we're leaving the lock screen we will be back at whatever
        // app or homescreen we left. We just have to start timing again
        this.setCurrentStartTime(now);
      }
      this.locked = false;
      break;

    case SCREENCHANGE:
      if (e.detail.screenOffBy === 'proximity') {
        // Ignore when the screen state changes because of the proximity sensor
        return;
      }

      if (e.detail.screenEnabled) {
        // We just woke up. Note the time. This will be used for recording
        // time on the lockscreen if we're locked or time at the old app.
        this.setCurrentStartTime(now);
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
        var app = this.locked ? this.lockscreenApp : this.getCurrentApp();
        this.metrics.recordInvocation(app, now - this.getCurrentStartTime());
      }
      break;

    case ATTENTIONCLOSED:
      // The attention window on top of the stack was closed. When there are
      // other attention windows, we reset the startTime of the top window on
      // the stack. Otherwise we reset the currentApp's start time when the
      // stack is empty.
      var attentionWindow = this.getTopAttentionWindow();
      if (attentionWindow && attentionWindow.app &&
          attentionWindow.app.manifestURL === e.detail.manifestURL) {
        this.metrics.recordInvocation(e.detail,
                                      now - attentionWindow.startTime);
        this.attentionWindows.pop();
      } else {
        debug('Unexpected attention window closed! ' + e.detail.manifestURL);
      }

      this.setCurrentStartTime(now);
      break;

    case INSTALL:
      this.metrics.recordInstall(e.detail.application);
      break;

    case UNINSTALL:
      this.metrics.recordUninstall(e.detail.application);
      break;

    case IDLE:
      this.idle = true;
      break;

    case ACTIVE:
      this.idle = false;
      break;

    case TIMECHANGE:
      if (this.metrics.relativeStartTime !== undefined) {
        // If we have a relative time recorded for this batch then we
        // can adjust the batch start time on NTP or user time changes.
        // This shouldn't really be necessary but we are seeing some
        // time changes on reboot where the time changes by more than
        // a day when the phone first starts up and connects to a network.
        // This may be caused by bug 1069863, and when that bug is fixed
        // we can consider removing this moztimechange handling code.
        var deltaT = performance.now() - this.metrics.relativeStartTime;
        var oldStartTime = this.metrics.data.start;
        var newStartTime = Date.now() - Math.round(deltaT);
        this.metrics.data.start = newStartTime;
        this.metrics.save(true);
        debug('System time change; converted batch start time from:',
              new Date(oldStartTime).toString(), 'to:',
              new Date(newStartTime).toString());
      }
      break;

    case IACMETRICS:
      //We need to check this here as we now have a helper module and we
      //don't want to accept any actions we don't handle.
      if (e.detail.action === 'websearch') {
        debug('got a search event for provider: ', e.detail.data);
        this.metrics.recordSearch(e.detail.data);
      }
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
    if (!this.metrics.isEmpty() && this.idle && navigator.onLine) {
      var absoluteTime = Date.now();
      // Have we tried and failed to send it before?
      if (this.lastFailedTransmission > this.metrics.startTime()) {

        // If so, then send it if the retry interval has elapsed
        if (absoluteTime - this.lastFailedTransmission > AUM.RETRY_INTERVAL) {
          this.transmit();
        }
      }
      // Otherwise, if we have not failed to transmit, then send it if the
      // reporting interval has elapsed.
      else if (absoluteTime - this.metrics.startTime() > AUM.REPORT_INTERVAL) {
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
      'developer.menu.enabled': false, // If true, data is probably an outlier
      'deviceinfo.hardware': 'unknown',
      'deviceinfo.os': 'unknown',
      'deviceinfo.product_model': 'unknown',
      'deviceinfo.software': 'unknown'
    };

    var urlInfoQuery = {
      'deviceinfo.platform_build_id': 'unknown',
      'deviceinfo.platform_version': 'unknown',
      'app.update.channel': 'unknown'
    };

    // Query the settings db to get some more device-specific information
    AUM.getSettings(deviceInfoQuery, function(deviceInfo) {
      data.deviceinfo = deviceInfo;
      data.simInfo = getSIMInfo();
    });

    // Query the settings db for parameters for hte URL
    AUM.getSettings(urlInfoQuery, function(urlInfoResponse) {
      // Now transmit the data
      send(data, urlInfoResponse);
    });

    function getSIMInfo() {
      var simInfo = {
        network: null,
        icc: null
      };

      if (SIMSlotManager.noSIMCardConnectedToNetwork()) {
        // No connected SIMs
        return simInfo;
      }

      var slots = SIMSlotManager.getSlots().filter(function(slot) {
        return !slot.isAbsent() && !slot.isLocked();
      });

      if (slots.length === 0) {
        // No unlocked or active SIM slots
        return simInfo;
      }

      var conn = slots[0].conn;
      if (!conn) {
        // No connection
        return simInfo;
      }

      var iccObj = navigator.mozIccManager.getIccById(conn.iccId);
      var iccInfo = iccObj ? iccObj.iccInfo : null;
      var voiceNetwork = conn.voice ? conn.voice.network : null;
      if (!iccInfo && !voiceNetwork) {
        // No voice network or ICC info
        return simInfo;
      }

      simInfo.network = MobileOperator.userFacingInfo(conn);
      if (voiceNetwork) {
        simInfo.network.mnc = voiceNetwork.mnc;
        simInfo.network.mcc = voiceNetwork.mcc;
      }

      if (iccInfo) {
        simInfo.icc = {
          mnc: iccInfo.mnc,
          mcc: iccInfo.mcc,
          spn: iccInfo.spn
        };
      }

      return simInfo;
    }

    function send(data, urlInfo) {

      var request = new TelemetryRequest({
        reason: AUM.TELEMETRY_REASON,
        deviceID: self.deviceID,
        ver: AUM.TELEMETRY_VERSION,
        url: AUM.REPORT_URL,
        appUpdateChannel: urlInfo['app.update.channel'],
        appVersion: urlInfo['deviceinfo.platform_version'],
        appBuildID: urlInfo['deviceinfo.platform_build_id']
      }, data);

      // We don't actually have to do anything if the data is transmitted
      // successfully. We are already set up to collect the next batch of data.
      function onload() {
        debug('Transmitted app usage data to', request.url);
      }

      function retry(e) {
        // If the attempt to transmit a batch of data fails, we'll merge
        // the new batch of data (which may be empty) in with the old one
        // and resave everything so we can try again later. We also record
        // the time of this failure so we don't try sending again too soon.
        debug('App usage metrics transmission failure:', e.type);

        // We use absolute time here because we will be comparing to
        // the absolute batch start time.
        self.lastFailedTransmission = Date.now();
        oldMetrics.merge(self.metrics);
        self.metrics = oldMetrics;
        self.metrics.save(true);
      }

      request.send({
        timeout: AUM.REPORT_TIMEOUT,
        onload: onload,
        onerror: retry,
        onabort: retry,
        ontimeout: retry
      });
    }
  };

  /*
   * A helper class that holds (and persists) a batch of app usage data
   */
  function UsageData() {
    this.data = {
      start: Date.now(),
      apps: {}, // Maps app URLs to usage data
      searches: {}
    };
    this.needsSave = false;
    // Record the relative start time, which we can use to adjust
    // this.data.start if we get a moztimechange event.
    this.relativeStartTime = performance.now();
  }

  /*
   * Get app usage for the current date
   */
  UsageData.prototype.getAppUsage = function(manifestURL, dayKey) {
    var usage = this.data.apps[manifestURL];
    dayKey = dayKey || this.getDayKey();

    // We lazily initialize both the per-app and per-day usage maps
    if (!usage) {
      this.data.apps[manifestURL] = usage = {};
    }

    var dayUsage = usage[dayKey];
    if (!dayUsage) {
      dayUsage = usage[dayKey] = {
        usageTime: 0,
        invocations: 0,
        installs: 0,
        uninstalls: 0,
        activities: {}
      };
      this.data.apps[manifestURL] = usage;
    }
    return dayUsage;
  };

  UsageData.prototype.getDayKey = function(date) {
    date = date || new Date();
    var dayKey = date.toISOString().substring(0, 10);
    return dayKey.replace(/-/g, '');
  };

  UsageData.prototype.getSearchCounts = function(provider) {
    var search = this.data.searches[provider];
    var dayKey = this.getDayKey();
    if (!search) {
      // If no usage exists for this provider, create a new empty object for it.
      this.data.searches[provider] = search = {};
      debug('creating new object for provider', provider);
    }

    var daySearch = search[dayKey];
    if (!daySearch) {
      daySearch = search[dayKey] = {
        count: 0
      };
    }
    return daySearch;
  };

  UsageData.prototype.startTime = function() {
    return this.data.start;
  };

  UsageData.prototype.isEmpty = function() {
    return Object.keys(this.data.apps).length === 0;
  };

  // We only care about recording certain kinds of apps:
  // - Apps pre-installed with the phone (certified, or using a gaia origin)
  // - Apps installed from the marketplace
  UsageData.prototype.shouldTrackApp = function(app) {
    if (!app) {
      return false;
    }

    // Bug 1134998: Don't track apps that are marked as private windows
    // Some app-like objects may not have the isPrivateBrowser function,
    // so we also check to make sure it exists here.
    if (typeof app.isPrivateBrowser === 'function' && app.isPrivateBrowser()) {
      return false;
    }

    // Gecko and the app window state machine do not send certain app properties
    // along in webapp-launch or appopened events, causing marketplace app usage
    // to not be properly recorded. We fall back on the system app's application
    // cache in these situations. See Bug 1137063
    var cachedApp = applications.getByManifestURL(app.manifestURL);
    var manifest = app.manifest || app.updateManifest;
    if (!manifest && cachedApp) {
      manifest = cachedApp.manifest || cachedApp.updateManifest;
    }

    var installOrigin = app.installOrigin;
    if (!installOrigin && cachedApp) {
      installOrigin = cachedApp.installOrigin;
    }

    var type = manifest ? manifest.type : 'unknown';
    if (type === 'certified') {
      return true;
    }

    if (MARKETPLACE_ORIGINS.indexOf(installOrigin) >= 0) {
      return true;
    }

    try {
      var url = new URL(app.manifestURL);
      return url.hostname.indexOf('gaiamobile.org') >= 0;
    } catch (e) {
      return false;
    }
  };

  UsageData.prototype.recordInvocation = function(app, time) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }

    // Convert time to seconds and round to the nearest second.  If 0,
    // don't record anything. (This can happen when we go to the
    // lockscreen right before sleeping, for example.)
    time = Math.round(time / 1000);
    if (time > 0) {
      var usage = this.getAppUsage(app.manifestURL);
      usage.invocations++;
      usage.usageTime += time;
      this.needsSave = true;
      debug(app, 'ran for', time);
    }
    return time > 0;
  };

  UsageData.prototype.recordSearch = function(provider) {
    debug('recordSearch', provider);

    if (provider == null) {
      return;
    }

    // We don't want to report search metrics for local search and any other
    // situation where we might be offline.  Check this here as this may change
    // in the future.
    if (navigator.onLine) {
      var search = this.getSearchCounts(provider);
      search.count++;
      debug('Search Count for: ' + provider + ': ', search.count);
      this.needsSave = true;
    }
  };

  UsageData.prototype.recordInstall = function(app) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }

    var usage = this.getAppUsage(app.manifestURL);
    usage.installs++;
    this.needsSave = true;
    debug(app, 'installed');
    return true;
  };

  UsageData.prototype.recordUninstall = function(app) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }

    var usage = this.getAppUsage(app.manifestURL);
    usage.uninstalls++;
    this.needsSave = true;
    debug(app, 'uninstalled');
    return true;
  };

  UsageData.prototype.recordActivity = function(app, url) {
    if (!this.shouldTrackApp(app)) {
      return false;
    }

    var usage = this.getAppUsage(app.manifestURL);
    var count = usage.activities[url] || 0;
    usage.activities[url] = ++count;
    this.needsSave = true;
    debug(app, 'invoked activity', url);
    return true;
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
      var newdays = newbatch.data.apps[app];
      for (var day in newdays) {
        var newusage = newdays[day];
        var oldusage = this.getAppUsage(app, day);

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
    }

    // loop through all the search providers that we have data for
    // and merge the new searches into the old searches.
    for (var provider in newbatch.data.searches) {
      var newsearch = newbatch.data.searches[provider];
      var oldsearch = this.data.searches[provider];

      if (!oldsearch) {
        // If no usage exists for this provider, create a new empty object.
        this.data.searches[provider] = {};
        debug('creating new object for provider', provider);
      }

      for (var daykey in newsearch) {
        var daySearch = oldsearch[daykey];
        if (!daySearch) {
          oldsearch[daykey] = newsearch[daykey];
        } else {
          var newsearchcount = newsearch[daykey].count;
          var oldsearchcount = oldsearch[daykey].count || 0;
          oldsearch[daykey].count = oldsearchcount + newsearchcount;
        }
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
        //Handle a scenario with old app data that does not have searches
        if (typeof usage.data.searches === 'undefined') {
          usage.data.searches = {};
        }

        // If we loaded persisted data, then the absolute start time can
        // and should no longer be adjusted. So remove the relative time.
        delete usage.relativeStartTime;
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
